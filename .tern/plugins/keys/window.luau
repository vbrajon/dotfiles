--!strict
-- ⌘N: a session note in its own tab (Tern's `new_note` opens it beside the focused pane).
tern.command({
	id = "note_tab",
	title = "New note in a new tab",
	icon = "file-plus",
	run = function(cx)
		local pane = cx.docs:new_note("Untitled", "")
		cx.layout:move_to_new_tab(pane)
		-- Notes open rendered whatever `markdown_rendered` says, and `toggle_source` acts on the
		-- focused view, so the note's own mode decides.
		local read = cx.session:read(pane)
		if type(read) == "table" and read.kind == "file" and read.mode ~= "source" then
			cx.layout:focus(pane)
			cx:command("toggle_source")
		end
	end,
})

-- One-shot: writes the chords and the Markdown source default through the app, so its in-memory
-- preferences and settings.json agree (hand edits to settings.json were overwritten on window close).
tern.command({
	id = "apply",
	title = "Keys: apply my chords and Markdown source default",
	icon = "key",
	run = function(cx)
		cx.settings:bind("cmd+shift+l", "split_right")
		cx.settings:bind("cmd+shift+-", "split_down")
		cx.settings:bind("cmd+n", "plugin.keys.note_tab")
		cx.settings:bind("cmd+shift+t", "plugin.keys.reopen_tab")
		cx.settings:bind("cmd+enter", "zoom")
		cx.settings:bind("cmd+left", "focus_pane:left")
		cx.settings:bind("cmd+right", "focus_pane:right")
		cx.settings:bind("cmd+up", "focus_pane:up")
		cx.settings:bind("cmd+down", "focus_pane:down")
		-- Web links open in the default browser; ⌘-click opens the other target (Tern).
		cx.settings:set("link_target", "Browser")
		cx.settings:set("reduce_motion", "on")
		-- The preference's dotted key is found by its leaf name, so the group it lives in need not be known.
		local key: string? = nil
		for k in pairs(cx.settings:list()) do
			if string.match(k, "markdown_rendered$") then
				key = k
			end
		end
		if key == nil then
			cx:toast("error", "Keys: chords applied", "no markdown_rendered preference found")
			return
		end
		local before = cx.settings:get(key)
		cx.settings:set(key, false)
		cx:toast("success", "Keys applied", key .. " was " .. tostring(before))
	end,
})

-- ⌘⇧T: reopen the last closed tab. Tern only reopens notes, so the window half keeps a snapshot of
-- every tab (split tree; per leaf the cwd, file path or url) refreshed on each event, and rebuilds
-- the newest closed one as a new tab. A terminal comes back as a fresh shell in its cwd: its
-- command is never replayed. A tab missing from the session is treated as closed by the sweep
-- itself, since `tab_closed` may fire after the tab's panes are gone.
type Leaf = { cwd: string?, path: string?, url: string?, block: string? }
type Tree = { leaf: Leaf?, split: Dir?, ratio: number?, [number]: Tree }
local tabs: { [number]: { name: string?, tree: Tree } } = {}
local closed: { { name: string?, tree: Tree } } = {}

local function tree_of(tree: TabTree, panes: { [number]: PaneInfo }): Tree?
	if tree.pane ~= nil then
		local pane = panes[tree.pane]
		if pane == nil then
			return nil
		end
		local leaf: Leaf = { cwd = if pane.cwd ~= "" then pane.cwd else nil }
		if pane.kind == "file" then
			leaf.path = pane.path
		elseif pane.kind == "browser" then
			leaf.url = pane.url
		elseif pane.kind == "plugin" then
			leaf.block = pane.block
		elseif pane.kind ~= "terminal" and pane.kind ~= "agent" then
			return nil
		end
		return { leaf = leaf }
	end
	local a = tree[1] and tree_of(tree[1], panes)
	local b = tree[2] and tree_of(tree[2], panes)
	if a and b then
		return { split = tree.split, ratio = tree.ratio, a, b }
	end
	return a or b
end

local function snapshot(cx: WindowCx)
	local panes: { [number]: PaneInfo } = {}
	for _, pane in cx.session:panes() do
		panes[pane.pane] = pane
	end
	local seen: { [number]: boolean } = {}
	for _, tab in cx.session:tabs() do
		seen[tab.id] = true
		local layout = cx.session:layout(tab.id)
		local tree = layout and tree_of(layout.root, panes)
		if tree then
			tabs[tab.id] = { name = tab.name, tree = tree }
		end
	end
	for id, tab in pairs(tabs) do
		if not seen[id] then
			table.insert(closed, tab)
			tabs[id] = nil
		end
	end
end

for _, ev in { "focus", "pane_created", "pane_closed", "tab_created", "tab_closed", "cwd", "title" } do
	tern.on(ev, function(_ev, cx: WindowCx)
		snapshot(cx)
	end)
end

-- Shells and plugin blocks are launched with the tab; files and browsers open into their leaf after.
local function launch_of(tree: Tree): TabSpec
	local leaf = tree.leaf
	if leaf then
		return { launch = { cwd = leaf.cwd, block = leaf.block } }
	end
	return { split = tree.split, ratio = tree.ratio, launch_of(tree[1]), launch_of(tree[2]) }
end

local function fill(cx: WindowCx, tree: Tree, built: TabTree)
	local leaf = tree.leaf
	if leaf and built.pane then
		if leaf.path or leaf.url then
			cx.layout:focus(built.pane)
			cx:open(leaf.path or leaf.url :: string, "replace")
		end
		return
	end
	if built[1] and built[2] then
		fill(cx, tree[1], built[1])
		fill(cx, tree[2], built[2])
	end
end

tern.command({
	id = "reopen_tab",
	title = "Reopen closed tab",
	icon = "history",
	available = function()
		return #closed > 0
	end,
	run = function(cx)
		local tab = table.remove(closed)
		if tab == nil then
			cx:toast("info", "No closed tab to reopen")
			return
		end
		local spec = launch_of(tab.tree)
		spec.name = tab.name
		local id, err = cx.layout:tab(spec)
		if id == nil or err then
			cx:toast("error", "Reopen failed", err)
			return
		end
		local layout = cx.session:layout(id)
		if layout then
			fill(cx, tab.tree, layout.root)
		end
	end,
})

