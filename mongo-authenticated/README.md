# `mongo-authenticated`

This container automatically starts up and restores an authenticated MongoDB instance.

## Restore on startup strategy

This container is the basis for a replicated MongoDB cluster, set up in a Docker Swarm, perhaps on distributed machines. Because we cannot guarantee which machine an instance will reside upon, we cannot guarantee the presence of a preexisting volume.

Even though using a bind mount to get to bare metal would make for a faster server, we also don't want to rely upon an individual machine's hardware.

The solution I chose was to use a Docker volume for the actual operation of the server, but then getting the data from a backup made on the host. This allows every instance to access the same backup data without attempting to dictate where the servers actually run. In a replication scenario, whichever instance declares itself primary first would actually perform the restore.

## Admin creation on startup strategy

Because the image has no data on it, it has no authentication credentials. Because credentials should be unique and ephemeral, they are created at startup from `run/secrets/mongo`. Once the users are created, then the restore commences.

**Admin user credentials should be created or changed shortly before a backup, to ensure a clean handover from created credentials to restored ones.** If credentials are overwritten with an old backup, the database will have to be manually accessed using the old credentials, have the credentials updated, then back up the database with the new credentials.

## Credentials

`mongo-authenticated` defines three different admins:

* A **user administrator** is responsible for creating all other user roles in all databases. This role is the most sensitive, since it can give rights to any other role, including itself.

* A **database administrator** is responsible for creating and dropping database tables. This responsibility should not be handed over to applications, which should only be permitted to CRUD data, not structures.

* A **backup administrator** is responsible for performing backups and restorations. Separating this responsibility out allows for automation of this functionality without exposing other admin functions.

These roles can be combined by identifying one or more belonging to the same user id.

## Environment variables

In addition to the credentials described above, this container requires the following environment variable:

`MONGO_BACKUP_NAME`: This is used by `/post_startup.sh` to identify which subdirectory in `/data/mongodb/backup` to restore the database from. If not provided, the database restore will be attempted from the host directory mounted at `/data/mongodb/backup`.

`MONGO_OPTIONS` (optional): If provided, this will be added to the command line when starting `mongod`.

## Code extension points

`mongo-authenticated` is intended to be the root of an authenticated cluster as well as individual applications. To provide flexibility, the following files can be overwritten to extend the basic autostart functionality.

Since this container is based in Alpine Linux, all shell files are run using `dash`. **Be sure that any `.sh` files you replace below are POSIX-compatible.** BASHisms will break the container.

The following files are intended to be replaced in descendant containers:

#### `/mongo-users.js`

Additional MongoDB users (admins as well as application interface roles) can be defined in this JavaScript file. Each user is defined in a line as follows:

```
users.push( UserFunctions.create(name, password, roles) );
```

`roles` is an array with one or more role elements, as defined in the MongoDB documentation for [`createUser`](https://docs.mongodb.com/manual/reference/command/createUser/#roles).

These users are added after the admin users defined above. If `name` matches the name of an existing user, the roles are merged into the existing user. The `password` field is ignored in this case, and the existing user's password is unchanged.

#### `/pre_startup.sh`

This shell script file is executed after the default support files are created and mongo-related shell variables are defined, but before `mongod` is started. This file can be replaced in descendant containers by script files that generate `/mongo-users.js`, for example.

The following shell variables are populated before this file is executed:

* `mongod`: The location of the `mongod` binary
* `mongod_log`: The location of the log file
* `mongo`: The location of the `mongo` shell binary
* `mongo_startup_js`: The location of the startup file that creates the admin users and runs mongo-users.js

#### `/post_startup.sh`

This shell script file is executed after `mongod` is started and the users are defined. In this container, it automatically sets up and restores the database from the location described above. If you want to maintain this functionality in a new image while adding new functionality, consider copying this file to a location unique to your image, then have your version of `/post_startup.sh` call this moved file.

## JavaScript usage

Because the Mongo shell uses JavaScript to run its commands, the user creation process is performed primarily using JavaScript. This gave me an opportunity to dive into functional programming techniques, since those weren't really in vogue at my former job.

The files for creating users, roles, and database access are found in [`assets/modules`](assets/modules). The primary relationships are between `UserFunctions.js` and `DatabaseFunctions.js`. `RoleDescriptorFunctions.js` is used to help merge and split role descriptions in users. `UserDefinedRoleFunctions.js` help for that specific use case. `HelperFunctions.js` is a collection of higher-order functions and transducers.

These files are then used by the files in [`assets/scripts`](assets/scripts). `build_mongo-admins.sh` reads the secrets to create a credentials file `mongo-admins.js`. `mongo-startup.js` loads the modules, loads `mongo-admins.js` and `mongo-users.js`, then runs them into the database.
