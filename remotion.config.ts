import { Config } from '@remotion/cli/config';

// MP4 (H.264) — YouTube, Instagram va TikTok uchun mos
Config.setVideoImageFormat('jpeg');
Config.setCodec('h264');
Config.setOverwriteOutput(true);
