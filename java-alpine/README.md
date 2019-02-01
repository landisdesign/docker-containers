# `java-alpine`

I wanted to create a Java 12 SDK container. When I was beginning this project, there was no Java 12 image out there, so here we are.

There were two specific challenges to making this container:

#### Removing the executables from Mac OSX quarantine

Mac OSX automatically quarantines any executable file downloaded from the internet. When it is first opened from the Finder, an alert dialog pops up, confirming that you trust the source, and if you say that you do, it takes the file out of quarantine and executes it.

On the command line, Mac OSX aborts execution of these files with extreme prejudice.

To take the files out of quarantine, I need to use paxctl to remove the extended attributes Apple adds to `java`.

#### Getting `modules` into the Git repository.

The base `modules` file for Java 12 holds code for every package in the JDK. It's well over the 100MB limit for committing to Git. To work around this, I zipped the file, uploaded the zipped file to the repository, and updated the Dockerfile to unzip it as part of the build process.