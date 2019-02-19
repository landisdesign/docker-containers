#!/bin/sh

touch ./~secret_data.txt
files="/run/secrets/$1"
for file in $files
do
	echo "$(cat ${file}) $(basename ${file})" >> ./~secret_data.txt
done

shift

touch ./~search_data.txt
for word
do
	echo $word >> ./~search_data.txt
done

RC=0
awk -v apos="'" 'NR==FNR {a[$1]=""} NR!=FNR {if ($1 in a) a[$1]=($2 " " a[$1])} END {g="";x="";for (i in a) {if (a[i]) g=(g i " " a[i] "\n"); else x=(apos i apos " " x);} if (x) {print "No secrets held the following data: " x | "cat 1>&2"; exit 1} else print g;}' ./~search_data.txt ./~secret_data.txt || RC=$?

rm ./~search_data.txt ./~secret_data.txt

exit $RC
