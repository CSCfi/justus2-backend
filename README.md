# JUSTUS Backend

#### Prerequisites
- Virtualbox ( Confirmed working version is 6.1.0 ) - https://www.virtualbox.org/wiki/Downloads
- Vagrant (Confirmed working version is 2.2.10 ) - https://www.vagrantup.com/downloads.html or via package manager
```
// Example
§ apt install vagrant
// You can always check that npm was installed correctly by typing for example:
§ vagrant --version

```

----

#### Clone the repository
- https://github.com/CSCfi/justus2-backend
- Add your public key to project root (id_rsa.pub)
- Create four directiories to project root:
   - csv-download
   - csv-upload
   - publications
   - temp
 - Fill missing values to env.variables file


#### Initialize development environment

- Navigate to project root and run command
```
§ vagrant up
```
#### Build and run

- After Virtual Box is created and running run these commands
```
$ npm install
$ vagrant ssh
$ bash start.sh
```
- The backend should now be up and running
