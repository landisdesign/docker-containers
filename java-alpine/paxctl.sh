if ! which paxctl; then
	apk add paxctl
	paxctl_added=1
fi

paxctl -c java
paxctl -m java

if [ "$paxctl_added" ]
then
	apk del paxctl
fi

if which setfattr; then
	setfattr -n user.pax.flags -v "mr" java
fi
