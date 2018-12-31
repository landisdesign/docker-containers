ARGS=$@
LOG_PATH="$CATALINA_HOME/logs/catalina.out"

/bin/sh -c "$CATALINA_HOME/bin/catalina.sh $ARGS"

echo "Tailing $LOG_PATH"

tail -f $LOG_PATH