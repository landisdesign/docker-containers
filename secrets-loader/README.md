# `secrets-loader`

This image contains a single file, `load_secrets.sh`, that reads secrets and places them into shell variables. It is used as follows:

```bash
. ./load_secrets.sh *secret names*
```

where `*secret names*` is a shell-expanded list of secret names. The values associated to the secrets with those names will be stored in variables with those secret names.

This script doesn't export the variables. It should be called using `.` instead of `source`.

**This image is not intended to be used as a base image.** It is solely intended to make `load_secrets.sh` available to copy into other images, in the following fashion:

```docker
FROM ...

COPY ./my_files /
COPY --from=landisdesign/secrets-loader ./load_secrets.sh /load_secrets.sh
...
```
