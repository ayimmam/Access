# lesson-component

TypeScript custom element, public configuration/events and component-owned styles.

The public text-lesson and fictional career elements are implemented. Build from the root with `npm run build`, then serve through the API examples. See the [current component contract](../../docs/architecture/INITIAL_IMPLEMENTATION.md) for attributes, events and limits. The career element accepts an optional absolute `certificate-base` URL for an independent host's fictional verification pages; only HTTP(S) URLs without embedded credentials are accepted.

`voice-navigation` enables optional English/Amharic career controls, and `voice-paused` stops capture/playback when a host hides them. `voice-auto-start` adds a hands-free welcome and begins one-response listening only when microphone permission is already granted; otherwise Start voice search receives focus so Enter can request permission. English uses an available browser speech voice and may use the browser's speech provider; optional Addis-backed Amharic requires a private backend worker, never a frontend key. Typed Amharic and shared saved-job state remain available without speech. See the [Amharic setup and privacy boundaries](../../docs/setup/ADDIS_AMHARIC_VOICE.md) and [voice/AT checklist](../../docs/setup/CAREER_VOICE_TESTING.md).
