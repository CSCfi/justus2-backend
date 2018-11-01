# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.require_version ">= 2.0.4"

# https://stackoverflow.com/a/28801317 | Demand a Vagrant plugin within the Vagrantfile?
required_plugins = %w(vagrant-vbguest)
plugins_to_install = required_plugins.select { |plugin| not Vagrant.has_plugin? plugin }
if not plugins_to_install.empty?
  puts "Installing plugins: #{plugins_to_install.join(' ')}"
  if system "vagrant plugin install #{plugins_to_install.join(' ')}"
    exec "vagrant #{ARGV.join(' ')}"
  else
    abort "Installation of one or more plugins has failed. Aborting."
  end
end

Vagrant.configure("2") do |config|

  config.vm.box = "centos/7"
  config.vm.network :private_network, ip: "10.10.10.10"
  config.vm.network :forwarded_port, guest: 80, host: 8080 
  config.vm.network :forwarded_port, guest: 80, host: 3000
  config.vm.network :forwarded_port, guest: 5432, host: 5432, auto_correct: true
  config.vm.synced_folder "./", "/opt/sources"
  config.vm.hostname = "justus-local"

  # Centos/7 box does not include quest additions by default which are needed for folder live reloading
  # https://github.com/dotless-de/vagrant-vbguest
  # config.vm.synced_folder ".", "/vagrant", type: "virtualbox"

  # Disable the new default behavior introduced in Vagrant 1.7, to
  # ensure that all Vagrant machines will use the same SSH key pair.
  # See https://github.com/mitchellh/vagrant/issues/5005
  config.ssh.insert_key = false

  config.vm.provision "ansible_local" do |ansible|
    ansible.inventory_path = "inventories/vagrant.yml"
    ansible.limit = "all"
    ansible.playbook = "deploy.yml"
    ansible.provisioning_path = "/vagrant/ansible"
    ansible.verbose = "v"
  end

  config.vm.provider "virtualbox" do |vbox|
    vbox.memory = 2048
    vbox.gui = false
  end
end
