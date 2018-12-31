MONGO="/usr/bin/mongo"
MONGOD="/usr/bin/mongod"
REPLICA_SET="my_set"
MONGO_LOG="/var/log/mongodb/mongod.log"
$MONGOD --fork --bind_ip_all --smallfiles --replSet $REPLICA_SET --logpath $MONGO_LOG
sleep 30
 
checkSlaveStatus(){
SLAVE=$1
$MONGO --host $SLAVE --eval db
while [ "$?" -ne 0 ]
do
echo "Waiting for $SLAVE to come up..."
sleep 5
$MONGO --host $SLAVE --eval db
done
}
 
if [ "$ROLE" = "master" ]
then
$MONGO --eval "rs.initiate()"
checkSlaveStatus $SLAVE1
$MONGO --eval "rs.add(\"${SLAVE1}:27017\")"
checkSlaveStatus $SLAVE2
$MONGO --eval "rs.add(\"${SLAVE2}:27017\")"
fi

tailf $MONGO_LOG