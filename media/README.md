# Landing page video

Put a short, silent, looping clip here named `hero.mp4` (H.264, 1280x720 or smaller, 10 to 20 seconds, under 4 MB).
Optionally add a `hero.webm` copy too; browsers that prefer WebM use it first.
The landing page plays it behind the title. Without it, the page plays the YouTube clip set in `config.js`
(`heroYoutube`) muted and on loop, and under both there is an animated night-sky backdrop.

Only use footage you have the rights to: your own filming (no faces, for the anonymous phase 1 video),
a free stock clip (Pexels and Pixabay allow this), or a clip whose owner gave written permission.
Turning someone else's YouTube video into a file needs their permission; embedding it with YouTube's player does not.

To cut a clip with ffmpeg:

    ffmpeg -ss 00:00:05 -t 15 -i source.mp4 -an -vf "scale=1280:-2" -c:v libx264 -crf 28 -movflags +faststart hero.mp4
