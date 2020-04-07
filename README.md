# JUSTUS Backend

Clone the repository from https://github.com/CSCfi/justus-backend

----

#### Prerequisites
- Virtualbox ( Tested with v5.1+, latest tested and confirmed working version is 5.2.12 ) - https://www.virtualbox.org/wiki/Downloads
- Vagrant ( Tested with v1.9+, latest tested and confirmed working version is 2.1.1 ) - https://www.vagrantup.com/downloads.html or via package manager
```
// Example
§ apt install vagrant
// You can always check that npm was installed correctly by typing for example:
§ vagrant --version
// Install plugin to get Virtualbox Guest Additions
§ vagrant plugin install vagrant-vbguest

```

----

#### Build and run

- Do the following in one terminal from the same folder
```
§ vagrant up
```
- Wait for vagrant up to finish then run these commands
```
$ vagrant ssh
$ bash start.sh
```
- The backend should now be up and running
