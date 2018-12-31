if ! which paxctl; then
	apk add paxctl
fi

paxctl -c java
paxctl -m java

if which setfattr; then
	setfattr -n user.pax.flags -v "mr" java
fi
