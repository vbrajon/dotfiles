bashrc:
	ln -s $(CURDIR)/bash.bashrc ~/.bashrc

vimrc:
	ln -s $(CURDIR)/vimrc ~/.vimrc

all:
	cp $(CURDIR)/vimrc /etc/vimrc
	cp $(CURDIR)/bash.bashrc /etc/bash.bashrc

