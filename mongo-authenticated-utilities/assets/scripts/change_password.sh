#! /bin/sh

echo "${USERS}" > ./~users.txt
echo "${PASSWORDS}" > ./~passwords.txt

awk -v auth_user=${auth_user} 'NR==FNR{u[FNR]=$1} NR!=FNR{p[FNR]=$1} END{for (i in u) {printf("db.changePassword(\"%s\", \"%s\");\n", u[i], p[i]);if (u[i]==auth_user){printf("db.auth(\"%s\", \"%s\");\n", u[i], p[i])}}}' ./~users.txt ./~passwords.txt