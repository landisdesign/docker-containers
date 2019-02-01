# Docker Containers for Self-Standing Notes App

This repository holds the containers I've created as a test for me to learn Git, Docker, MongoDB, shell scripting, and generally the Ops side of DevOps.

I'm working on building containers for microservices. My intent is to create containers that stand up with the absolute minimum of admin intervention. I want the standup processes to be reproducible and maintainable, which means scripting everything.

I'm using Shell script primarily, versus Python or Perl, because Shell and UNIX/Linux commands are where I am weakest. By doing everything I can in the basic shell I hope to strengthen my skills here. Some of these scripts are complex enough that they could lend themselves to being written in Python, but that's not what I want to learn here.

I chose to use MongoDB due to its usability in Adobe Experience Manager. Although I understand that it should not be used in prodution environments due to adding additional points of failure without an improvement in throughput, I figure if I'm going to play with building DB containers, I might as well use one that I might encounter when working with AEM.

The containers are as follows:

### [`java-alpine`](java-alpine/)
This was an attempt to make as small a jdk-12 container as possible, for use by Tomcat.

### [`mongo-authenticated`](mongo-authenticated/)
This is the root of my attempts to create a self-starting MongoDB instance. All other `mongo-authenticated-*` images build off of this one.

### [`mongo-authenticated-backup`](mongo-authenticated-backup/)
This is used as part of an automated backup process using mongodump and the `backup-mondo.sh` script found in my DevOps repository.

### [`mongo-authenticated-cluster`](mongo-authenticated-cluster/)
This stands up a MongoDB replicated cluster and automatically pulls files from the backup reated by `mongo-authenticated-backup`.

### [`mongo-cluster`](mongo-cluster/)
This was my original attempt at clustering, based upon [this article](http://www.tothenew.com/blog/mongodb-replica-set-using-docker-networking-and-docker-compose/). I didn't like how it required defining a specific primary, because that prevents us from simply duplicating configs across the swarm and letting the instances sort themselves out.

### [`tomcat-alpine`](tomcat-alpine/)
Although there is already a formal tomcat image out there, I wanted to create my own after considering how there are companies who would want to bake their own instead of relying on a third party.

Currently the repository includes some basic Jest configuration, to allow for unit testing the JavaScript used by MongoDB to create its users and provide cluster information.