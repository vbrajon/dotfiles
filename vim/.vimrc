runtime! archlinux.vim

" Vundle
set nocompatible
filetype off
set rtp+=~/.vim/bundle/Vundle.vim
call vundle#begin()
Plugin 'gmarik/Vundle.vim'
" Zen
Plugin 'junegunn/limelight.vim'
Plugin 'junegunn/goyo.vim'
" Motion - todo, choose a plugin
Plugin 'gcmt/breeze.vim'
Plugin 'Lokaltog/vim-easymotion'
" File Explorer - todo, find a nice finder + tree view
Plugin 'scrooloose/nerdtree'
Plugin 'jistr/vim-nerdtree-tabs'
Plugin 'kien/ctrlp.vim'
" Efficiency
Plugin 'terryma/vim-multiple-cursors'
Plugin 'tpope/vim-surround'
Plugin 'tomtom/tcomment_vim'
" Snippet
" Plugin 'SirVer/ultisnips'
" UI
Plugin 'vim-airline/vim-airline'
Plugin 'vim-airline/vim-airline-themes'
Plugin 'airblade/vim-gitgutter'
Plugin 'flazz/vim-colorschemes'
call vundle#end()

syntax on
filetype plugin on
colorscheme Monokai
set clipboard=unnamedplus
set t_Co=256
set encoding=utf-8
set mouse=a
set paste
" Use <C-L> to clear the highlighting of :set hlsearch.
if maparg('<C-L>', 'n') ==# ''
  nnoremap <silent> <C-L> :nohlsearch<CR><C-L>
endif
set iskeyword+=-
set wildignore+=*/.git/*,*/.hg/*,*/.svn/*
let g:ctrlp_custom_ignore = '\v[\/]\.(git|hg|svn)$'

" UI
set history=10000
set ruler
set number
set showmatch
set showcmd
set textwidth=80
set nowrap
set scrolloff=3
set sidescrolloff=5
set sidescroll=1

" Tabs
set expandtab
set shiftwidth=2
set softtabstop=2
set shiftround
set noautoindent
set nosmartindent

" Tabs
let g:airline_theme='badwolf'
let g:airline#extensions#tabline#enabled = 1
" Disable tComment to escape some entities
let g:tcomment#replacements_xml={}

" Keybindings
let mapleader = ","

" https://github.com/vbrajon
" cmap w!! w !sudo tee > /dev/null %
nmap "" viwS"
nmap '' viwS'
nnoremap <S-Up> V
vmap <S-Up> k
nnoremap <S-Down> V
vmap <S-Down> j

" http://learnvimscriptthehardway.stevelosh.com
nnoremap <Leader>ev :tabe ~/.vimrc<cr>
nnoremap <Leader>sv :w<esc>:source ~/.vimrc<cr>
" inoremap jk <esc>

" https://github.com/grigio/vim-sublime
" Find
map <C-f> /
" indend / deindent after selecting the text with (⇧ v), (.) to repeat.
vnoremap <Tab> >
vnoremap <S-Tab> <
" comment / decomment & normal comment behavior
vmap / gc
" Text wrap simpler, then type the open tag or ',"
vmap <C-w> S
" Cut, Paste, Copy
vmap <C-x> d
vmap <C-v> p
vmap <C-c> y
nnoremap <C-x> dd
nnoremap <C-c> yy
" Undo, Redo (broken)
" nnoremap <C-z> :undo<CR>
" inoremap <C-z> <Esc>:undo<CR>
" nnoremap <C-S-z> :redo<CR>
" inoremap <C-S-z> <Esc>:redo<CR>
" Tabs
nnoremap <C-S-b> :tabmove -1<CR>
inoremap <C-S-b> <Esc>:tabmove -1<CR>i
nnoremap <C-S-n> :tabmove +1<CR>
inoremap <C-S-n> <Esc>:tabmove +1<CR>i
nnoremap <C-b> :tabprevious<CR>
inoremap <C-b> <Esc>:tabprevious<CR>i
nnoremap <C-n> :tabnext<CR>
inoremap <C-n> <Esc>:tabnext<CR>i
nnoremap <C-t> :tabnew<CR>
inoremap <C-t> <Esc>:tabnew<CR>i
nnoremap <C-k> :tabclose<CR>
inoremap <C-k> <Esc>:tabclose<CR>i
" Options
nnoremap <Leader>p :set paste<CR>
nnoremap <Leader>o :set nopaste<CR>
noremap  <Leader>g :GitGutterToggle<CR>

" http://items.sjbach.com/319/configuring-vim-right
set hidden
nnoremap ' `
nnoremap ` '
runtime macros/matchit.vim
set wildmode=list:longest

" Tmp directory
set backupdir=~/.vim/tmp,~/tmp,/tmp
set directory=~/.vim/tmp,~/tmp,/tmp

" Search / Highlight
set hlsearch
set incsearch
set ignorecase
nnoremap <silent> <leader>h :silent :nohlsearch<CR>

" Space/Tab/Eol
set listchars=tab:>-,trail:·,eol:$
nnoremap <silent> <leader>? :set nolist!<CR>

set shortmess=atI
