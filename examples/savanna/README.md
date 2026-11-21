# savanna

Integrated example derived from, without altering, the supplied static captures.

Run the API after building the component, then open `/` or `/demo/savanna`. The Savanna-style course page uses the supplied ALX video and caption export with native video controls, searchable transcript, offline resources and a switchable 3D concept draft. The ALX sample defaults to a generated EthSL pronoun study. Choose ASL or Off in Avatar language. Rebuild the EthSL motion with `node scripts/build_asl_demo.mjs --ethsl`. Its first- and second-person pointing and first-person plural arc are based on Table 2.2 of [Translation of Continuous Signs in Ethiopian Sign Language to Amharic Text](https://www.academia.edu/64242781/Translation_of_Continuous_Signs_in_Ethiopian_Sign_Language_to_Amharic_Text). Both language drafts need fluent review.

In **With Access**, use **Lesson voice navigation**. Say or type **Play video**, **Pause video**, **English captions**, **Amharic captions**, **Captions off**, **Open transcript**, **Offline formats**, **Open Career Gateway**, or **Stop**. Offline formats focuses the download list so you can choose a file. Career Gateway follows the link for the selected lesson. The native controls, transcript search, download links, and keyboard commands also work independently of the microphone.

The English greeting listens for one command after playback only if the browser has already granted microphone permission. Choose **Listen for a command** for first-time access. Playing the lesson ends the voice session. Listening pauses the lesson, and typing or focusing the private reflection field cancels capture or prompt playback. Amharic **Read command help aloud** and **Listen for a command** are separate actions. Review or edit the captured text before running it. The provider receives only the fixed help prompt or an explicitly started recording. The live relay requires the [approved Render origin](../../docs/setup/RENDER_CAREER_VOICE.md#restore-amharic-speech-on-the-existing-render-host).

The local avatar co-design review at `/demo/avatar-review` opens with a neutral 3D hands pose. Load local study files to enable clip playback and observations. The neutral pose is a visual preview for checking the renderer.

Open **Ask Access** for the same career question in English and Amharic. Completing a lesson focuses the Career Gateway link. Returning to Savanna restores that lesson and its demo completion in the same tab. See the [EthSL workflow](../../docs/architecture/SIGN_AVATAR_WORKFLOW.md) for reviewed avatar interpretation requirements.
