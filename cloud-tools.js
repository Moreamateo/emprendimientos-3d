/* Shared, pure helpers. Arrays are atomic: simultaneous edits are never guessed. */
(function(root){
  // Postgres JSONB may reorder object keys; key order is not a data change.
  function equal(a,b){
    if(a===b)return true;
    if(!a || !b || typeof a!=='object' || typeof b!=='object')return false;
    if(Array.isArray(a)!==Array.isArray(b))return false;
    const keys=Object.keys(a);
    return keys.length===Object.keys(b).length && keys.every(k=>Object.prototype.hasOwnProperty.call(b,k) && equal(a[k],b[k]));
  }
  const object=v=>v!==null && typeof v==='object' && !Array.isArray(v);
  function merge(base,local,remote,path='datos'){
    if(equal(local,base))return structuredClone(remote);
    if(equal(remote,base) || equal(local,remote))return structuredClone(local);
    if(object(local) && object(remote) && (object(base) || base===undefined)){
      const result={};
      for(const key of new Set([...Object.keys(base || {}),...Object.keys(local),...Object.keys(remote)])){
        const value=merge(base?.[key],local[key],remote[key],path+'.'+key);
        if(value!==undefined)result[key]=value;
      }
      return result;
    }
    throw Error('Hay cambios simultáneos en '+path+'. Conservamos tu edición; revisá los cambios de la nube antes de continuar.');
  }
  function wear(cfg){
    if(cfg.wear!==undefined && cfg.wear!==null && cfg.wear!=='' && Number.isFinite(Number(cfg.wear)))return Math.max(0,Number(cfg.wear));
    return Math.max(0,Number(cfg.parts)||0)/Math.max(1,Number(cfg.life)||1);
  }
  function photoReferences(data){
    const refs=new Set();
    function visit(value){
      if(!value || typeof value!=='object')return;
      if(typeof value.photoPath==='string')refs.add(value.photoPath);
      Object.values(value).forEach(visit);
    }
    visit(data);return refs;
  }
  root.CloudTools={merge,wear,photoReferences,equal};
  if(typeof module!=='undefined')module.exports=root.CloudTools;
})(typeof globalThis!=='undefined'?globalThis:this);
