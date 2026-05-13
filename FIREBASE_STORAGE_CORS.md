 # Firebase Storage CORS

This project uploads files from the Vite dev server at `http://localhost:3500`
to Firebase Storage. Browser uploads use a CORS preflight request before the
actual upload, so the Storage bucket must have the CORS rules in `cors.json`
applied.

Apply the config with Google Cloud CLI:

```powershell
gcloud storage buckets update gs://student-portal-6b871.appspot.com --cors-file=cors.json
```

If this returns `Not Found`, open Firebase Console > Storage and confirm the
actual bucket name. New Firebase Storage buckets often use:

```text
student-portal-6b871.firebasestorage.app
```

When the bucket name is different, update `VITE_FIREBASE_STORAGE_BUCKET` in
`.env`, then apply the CORS config to that exact bucket name.

Check the active config:

```powershell
gcloud storage buckets describe gs://student-portal-6b871.appspot.com --format="default(cors_config)"
```

Required IAM permissions on the bucket:

- `storage.buckets.get`
- `storage.buckets.update`

If you prefer `gsutil`, this also works:

```powershell
gsutil cors set cors.json gs://student-portal-6b871.appspot.com
gsutil cors get gs://student-portal-6b871.appspot.com
```

After applying the config, restart the browser tab or clear the failed request
state and try uploading again from `http://localhost:3500/dokumanlarim`.
