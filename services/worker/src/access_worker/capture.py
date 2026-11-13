"""Offline CPU landmark capture with explicit coordinate spaces and missing-data records."""
import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import tempfile


class OneEuroFilter:
    def __init__(self, minimum=1.2, beta=.01):
        if not math.isfinite(minimum) or not math.isfinite(beta) or minimum <= 0 or beta < 0:
            raise ValueError('Invalid filter settings')
        self.minimum, self.beta = minimum, beta
        self.previous = self.raw_previous = self.derivative = self.time = None

    def update(self, value, time):
        if not math.isfinite(value) or not math.isfinite(time):
            raise ValueError('Filter input must be finite')
        if self.time is None:
            self.previous, self.raw_previous, self.derivative, self.time = value, value, 0, time
            return value
        dt = time - self.time
        if dt <= 0:
            raise ValueError('Filter time must increase')
        def alpha(cutoff):
            return 1 / (1 + 1 / (2 * math.pi * cutoff * dt))
        a = alpha(1)
        derivative = a * (value - self.raw_previous) / dt + (1 - a) * self.derivative
        a = alpha(self.minimum + self.beta * abs(derivative))
        filtered = a * value + (1 - a) * self.previous
        self.previous, self.raw_previous, self.derivative, self.time = filtered, value, derivative, time
        return filtered


def digest(path):
    hasher = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            hasher.update(block)
    return hasher.hexdigest()


def extract(args):
    import cv2
    import mediapipe as mp
    from mediapipe.tasks.python import vision
    paths = [args.input, args.pose_model, args.hand_model, args.face_model]
    if not all(p.is_file() for p in paths):
        raise ValueError('Input video and all three local model files are required')
    if args.output.exists():
        raise ValueError('Output already exists')
    cap = cv2.VideoCapture(str(args.input))
    if not cap.isOpened():
        raise ValueError('Cannot open input video')
    fps = cap.get(cv2.CAP_PROP_FPS)
    expected_frames = cap.get(cv2.CAP_PROP_FRAME_COUNT)
    if not math.isfinite(fps) or fps <= 0:
        cap.release()
        raise ValueError('Video frame rate is unavailable')
    args.output.parent.mkdir(parents=True, exist_ok=True)
    temp = None
    filters = {}
    def points(key, values, time):
        if not values:
            filters.pop(key, None)
            return None
        if key not in filters:
            filters[key] = [OneEuroFilter() for _ in range(len(values) * 3)]
        if len(filters[key]) != len(values) * 3:
            raise ValueError('Landmark count changed')
        return [[filters[key][i * 3 + axis].update(getattr(point, name), time)
                 for axis, name in enumerate(('x', 'y', 'z'))] for i, point in enumerate(values)]
    def base(path):
        return mp.tasks.BaseOptions(model_asset_path=str(path), delegate=mp.tasks.BaseOptions.Delegate.CPU)
    frames = 0
    previous = -1
    try:
        with vision.PoseLandmarker.create_from_options(vision.PoseLandmarkerOptions(base_options=base(args.pose_model), running_mode=vision.RunningMode.VIDEO, num_poses=1)) as pose, \
             vision.HandLandmarker.create_from_options(vision.HandLandmarkerOptions(base_options=base(args.hand_model), running_mode=vision.RunningMode.VIDEO, num_hands=2)) as hands, \
             vision.FaceLandmarker.create_from_options(vision.FaceLandmarkerOptions(base_options=base(args.face_model), running_mode=vision.RunningMode.VIDEO, num_faces=1, output_face_blendshapes=True, output_facial_transformation_matrixes=True)) as face, \
             tempfile.NamedTemporaryFile('w', dir=args.output.parent, suffix='.jsonl', delete=False, encoding='utf-8') as output:
            temp = Path(output.name)
            output.write(json.dumps({'type': 'metadata', 'schema_version': '1.0', 'language': args.language,
                                     'review_status': 'machine-draft', 'source_sha256': digest(args.input),
                                     'models': {p.name: digest(p) for p in paths[1:]}, 'fps': fps,
                                     'runtime': {'mediapipe': mp.__version__, 'opencv': cv2.__version__, 'inference_delegate': 'CPU'},
                                     'smoothing': {'type': 'one-euro', 'minimum_cutoff': 1.2, 'beta': .01, 'derivative_cutoff': 1},
                                     'subject_assumption': 'Single visible subject; cross-task identity and coordinate calibration require review',
                                     'coordinates': 'Separate image-normalized and task-world coordinates; retargeting required'}) + '\n')
            while True:
                ok, frame = cap.read()
                if not ok:
                    break
                reported = cap.get(cv2.CAP_PROP_POS_MSEC)
                timestamp = round(reported) if math.isfinite(reported) and reported > previous else round(frames / fps * 1000)
                timestamp = max(previous + 1, timestamp)
                previous = timestamp
                time = timestamp / 1000
                image = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
                p, h, f = pose.detect_for_video(image, timestamp), hands.detect_for_video(image, timestamp), face.detect_for_video(image, timestamp)
                hand_records = {}
                candidates = {}
                for index, classification in enumerate(h.handedness):
                    candidate = classification[0]
                    label = candidate.category_name
                    if label not in candidates or candidate.score > h.handedness[candidates[label]][0].score:
                        candidates[label] = index
                for label, index in candidates.items():
                    hand_records[label] = {'confidence': h.handedness[index][0].score,
                                           'normalized': points(label, h.hand_landmarks[index], time),
                                           'world': points(label + '-world', h.hand_world_landmarks[index], time)}
                for label in ('Left', 'Right'):
                    if label not in hand_records:
                        filters.pop(label, None)
                        filters.pop(label + '-world', None)
                record = {'type': 'frame', 'time': time,
                          'pose_normalized': points('pose', p.pose_landmarks[0] if p.pose_landmarks else None, time),
                          'pose_world': points('pose-world', p.pose_world_landmarks[0] if p.pose_world_landmarks else None, time),
                          'pose_visibility': [v.visibility for v in p.pose_landmarks[0]] if p.pose_landmarks else None,
                          'hands': hand_records,
                          'handedness_ambiguous': len(candidates) < len(h.handedness),
                          'face_normalized': [[v.x, v.y, v.z] for v in f.face_landmarks[0]] if f.face_landmarks else None,
                          'face_blendshapes': {v.category_name: v.score for v in f.face_blendshapes[0]} if f.face_blendshapes else None,
                          'face_transform': f.facial_transformation_matrixes[0].tolist() if f.facial_transformation_matrixes else None}
                output.write(json.dumps(record, allow_nan=False) + '\n')
                frames += 1
            if not frames:
                raise ValueError('Video contains no decoded frames')
            if math.isfinite(expected_frames) and expected_frames > frames + 1:
                raise ValueError('Video decoding ended before the declared frame count')
            output.write(json.dumps({'type': 'summary', 'frames': frames}) + '\n')
        # A same-filesystem hard link publishes a complete file and fails if another job won the name.
        os.link(temp, args.output)
    finally:
        cap.release()
        if temp and temp.exists():
            temp.unlink()
    print(f'Captured {frames} frames. Retargeting, occlusion correction and signer review remain pending.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--language', choices=['ethsl', 'asl'], required=True)
    for model in ('pose', 'hand', 'face'):
        parser.add_argument(f'--{model}-model', type=Path, required=True)
    extract(parser.parse_args())


if __name__ == '__main__':
    main()
