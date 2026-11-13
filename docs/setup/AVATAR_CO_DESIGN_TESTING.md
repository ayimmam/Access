# Test the avatar motion study

The first sample uses the supplied ALX video's presenter gestures to test capture, finger articulation, face controls and video synchronization. EthSL and ASL translation remain pending. Both language-target folders currently carry the same captured gestures. The source caption wording and timing also require review.

## Start the review page

1. Start the project using the root README's setup and run commands.
2. Open `http://127.0.0.1:8000/demo/avatar-review` in a current browser with WebGL support.
3. Extract `Access-avatar-motion-studies.zip` if using the prepared package. Choose the `ethsl` or `asl` folder for your intended language review.
4. In **Load a language manifest and its GLB files**, select the language JSON plus all `.glb` files in that folder. The generated `study-info.json` contains processing details and can be left unselected.
5. Activate **Load draft performance**. Wait for the loaded status, then play the source video or use **Jump to source cue**.

The project-generated sample files are also available locally under `artifacts/avatar-study/co-design/`. The character is an original stylized African woman with 30 articulated finger joints, eyebrow/blink controls and limited mouth shapes. Tracking can produce inaccurate wrist orientation, hand contact, depth and expression. Missing detections hold the previous pose, and cuts in the source video can produce abrupt transitions.

## Record observations

Pause near the moment you want to discuss. Choose a category and result, write an observation, then activate **Save observation at current time**. The page records the video time and source cue with your note. Repeat as needed and activate **Download feedback JSON** before closing or reloading the page.

Useful observations cover

- Whether both hands, fingertips and the face remain visible.
- Finger separation, palm direction, wrist rotation and hand/body contact errors.
- Face and body movement that distracts from the intended meaning.
- Sudden changes between speakers, missing detections and transitions.
- Delay or drift after play, pause, seeking and playback-rate changes.
- Caption errors, unclear wording and interpretation that needs to be authored in the target language.
- Keyboard operation, caption size, narrow screens and the clarity of the draft label.

Use **Language and meaning** to identify translation work with an EthSL or ASL signer. Include the intended meaning, a proposed correction and an available reference recording when appropriate. A fluent signer and Deaf reviewer should later assess the complete rendered language performance.

## Share the results

The viewer processes the selected files in the browser and saves observations in the current session. Download feedback before switching packages. Follow the team's agreed consent and sharing arrangements for any new recording. Keep names, contact information and other personal details out of feedback notes.

Each feedback file includes the selected manifest's SHA-256, source hashes, language target, cue IDs, timestamps and observations. Its status is `feedback-only`. Anteneh collects UI feedback, Biniyam corrects capture/retargeting and source issues, and Hailemichael reviews asset and provenance checks. Human approval of a revised signed performance follows the [blueprint runbook](../architecture/AVATAR_BLUEPRINT_EVALUATION.md).
