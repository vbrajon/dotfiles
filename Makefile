all:    bashrc vimrc

bashrc:
	ln -s $(CURDIR)/bash.bashrc ~/.bashrc

vimrc:
	ln -s $(CURDIR)/vimrc ~/.vimrc

global:
	ln -fs $(CURDIR)/vimrc /etc/vimrc
	ln -fs $(CURDIR)/bash.bashrc /etc/bash.bashrc

