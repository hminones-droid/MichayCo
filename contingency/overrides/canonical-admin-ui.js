/* Micha & Co DEV safe mode.
   Global DOM mutation/reparenting is intentionally disabled after navigation freeze regression.
   Keep this file side-effect free until screen-specific UI fixes are reintroduced without observers. */
(function(){
  'use strict';
  document.documentElement.setAttribute('data-admin-safe-mode','true');
})();
