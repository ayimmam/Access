# Biniyam — Windows / building and data

Read [common setup](COMMON.md) first. You own the initial data model, API, shared domain logic, pipeline and export work. Coordinate the contract with Anteneh and access controls with Hailemichael.

## Recommended development environment

Use **WSL 2 with Ubuntu for the normal codebase**, Docker Desktop's WSL backend for containers, and native Windows for NVDA and any later vendor-specific NPU experiment. This separates the portable backend from hardware-specific experimentation.

If WSL is not already installed, run in **Administrator PowerShell**:

```powershell
wsl --install -d Ubuntu
```

Restart if prompted, finish Ubuntu account setup, then verify in PowerShell:

```powershell
wsl --update
wsl --list --verbose
```

The Ubuntu distribution should use version 2. Install [Docker Desktop for Windows](https://docs.docker.com/desktop/setup/install/windows-install/), enable its WSL backend and Ubuntu integration, and start Docker Desktop. Do not also install a second Docker Engine inside this WSL distribution.

In the **Ubuntu terminal**:

```sh
sudo apt update
sudo apt install -y git curl ca-certificates build-essential ffmpeg
```

Install Node 24 and uv **inside WSL** using the common guide. Run `uv python install 3.11`. A Windows installation of Node/Python does not substitute for the WSL toolchain. Keep the development checkout in the WSL home filesystem (for example `~/projects/Access`), not `/mnt/c/`; use an editor with WSL integration. Do not reuse a Windows virtual environment in WSL.

Run the common verification commands from Ubuntu. Docker should connect to Docker Desktop. Install NVDA natively using [NV Access](https://www.nvaccess.org/download/); test in Windows Chrome/Firefox against the local URL once the app exists.

## Data and media preparation

- Agree the lesson/version/media-slot identifiers, review states and export-job fields with Anteneh before schema implementation.
- Prepare PostgreSQL through the agreed container version; a separate native Windows PostgreSQL service is unnecessary.
- Prepare one authorized short MP4 and its reviewed English/Amharic transcript. Use `ffprobe` to record codec, duration and stream details; do not commit private content.
- Download the [DAISY Pipeline distribution](https://daisy.github.io/pipeline/Get-Help/User-Guide/Installation/) with the required Braille modules. Follow the selected package's runtime requirements rather than installing an arbitrary Java version.
- Evaluate Liblouis and WeasyPrint in an isolated preparation environment. Their final installation belongs in the conversion worker image; avoid coupling production to native Windows paths.
- Download an Ethiopic font with its license. Prepare a representative document for PDF tags/reading-order checks and an expert-approved BRF sample.

## Optional transcription preparation

Whisper is optional; reviewed manual transcript import remains available. Its [official setup](https://github.com/openai/whisper) requires FFmpeg. If evaluating it now, use a separate directory outside the repo, a Python 3.11 virtual environment and a short authorized sample. Download a **multilingual** model, not an English-only `.en` model, and test CPU execution first. Record accuracy on Amharic, processing time and memory use before selecting model size. Do not promise automatic Amharic translation from transcription alone.

## NPU: identify first, install later

The exact CPU/NPU model is pending. In native **PowerShell**, record:

```powershell
Get-CimInstance Win32_Processor | Select-Object Name
Get-CimInstance Win32_ComputerSystem | Select-Object Model, TotalPhysicalMemory
```

Also inspect Device Manager / Task Manager for the NPU name and driver version. Share hardware identifiers only, not a full device inventory or serial numbers.

| Hardware confirmed later | Evaluation route |
|---|---|
| Intel supported NPU | Check OpenVINO's supported hardware and driver instructions |
| AMD Ryzen AI | Check the matching AMD Ryzen AI SDK and model/operator support |
| Qualcomm Snapdragon | Check Qualcomm's supported runtime and model deployment route |

Do not install OpenVINO solely because the laptop has an NPU. Intel's [NPU setup](https://docs.openvino.ai/2026/get-started/install-openvino/configurations/configurations-intel-npu.html) requires the matching driver. An NPU is not CUDA, and normal Whisper/PyTorch or Docker does not automatically use it. WSL/device pass-through and model conversion support must be verified for the actual device. Any experiment should remain separate from the CPU-capable worker.

## Ready when

- [ ] WSL, Node 24, Python 3.11, FFmpeg and Docker verification pass.
- [ ] Public sample media/transcript and font files are available locally.
- [ ] Data and export dependencies are listed for a later locked installation.
- [ ] NVDA is installed and can read a browser page.
- [ ] NPU model is recorded, or explicitly left pending without blocking the core work.
- [ ] Braille/PDF toolchain uncertainties and reviewer needs are shared with the team.
