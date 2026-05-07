function CSInterface(){}
CSInterface.prototype.evalScript=function(s,cb){if(window.__adobe_cep__)window.__adobe_cep__.evalScript(s,cb||function(){});else if(cb)cb('');};
