# Publish: the upload queue

Every finished personal video lands here as `NN-<slug>/`: the video (`NN-<slug>.mp4`), its thumbnails and its
`posts.md`, plus `dm-guide.docx` when the video has a comment keyword: the guide to DM back, always a document (built
from `videos/<slug>/dm-guide.md` by `kit/guide_docx.py`; upload it to Google Drive and open it with Google Docs, never copy it from
a preview). The number is its serial, in the order it was finished, and never changes. **Upload the lowest number
first.** Once it is posted, move its folder into `posted/` and fill in the Posted table in its `posts.md`.

`lanes/animated/fast.py final <slug>` puts a new video here with the next number. The working files (script,
voice, scenes, music) stay in `videos/<slug>/`; only the finished file moves, so nothing is stored twice.
Agency videos go to `agency/videos/<slug>/` instead.
