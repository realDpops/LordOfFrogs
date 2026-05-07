/* host.jsx - Lord of Frogs v4 */
function importFileInAE(p) {
  try {
    var f = new File(p.replace(/\\/g, '/'));
    if (!f.exists) f = new File(p.replace(/\//g, '\\'));
    if (!f.exists) return 'not_found';
    var opts = new ImportOptions(f);
    opts.sequence = false;
    var item = app.project.importFile(opts);
    if (!item) return 'failed';
    var folder = null;
    for (var i = 1; i <= app.project.items.length; i++) {
      if (app.project.items[i] instanceof FolderItem && app.project.items[i].name === 'LORD OF FROGS') {
        folder = app.project.items[i]; break;
      }
    }
    if (!folder) folder = app.project.items.addFolder('LORD OF FROGS');
    item.parentFolder = folder;
    return 'ok';
  } catch(e) { return 'err:' + e.message; }
}
function browseFolder() {
  try { var f = Folder.selectDialog('Destination'); return f ? f.fsName : ''; } catch(e) { return ''; }
}
function pickFile(filter) {
  try { var f = File.openDialog('Choisir fichier', filter || '*.*', false); return f ? f.fsName : ''; } catch(e) { return ''; }
}
function getDownloadsFolder() {
  try {
    var p = $.getenv('USERPROFILE') || Folder.userData.fsName;
    var d = new Folder(p + '\\Downloads\\LordOfFrogs');
    if (!d.exists) d.create();
    return d.fsName;
  } catch(e) { return Folder.desktop.fsName; }
}
function openFolder(p) {
  try { app.system.callSystem('explorer "' + p.replace(/\//g, '\\') + '"'); } catch(e) {}
}
