// This script helps clear cookies in the browser console
// Copy and paste this into your browser console when testing

function clearAllCookies() {
  const cookies = document.cookie.split(";");
  
  console.log('Current cookies:', cookies);
  
  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i];
    const eqPos = cookie.indexOf("=");
    const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
    document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    console.log(`Deleted cookie: ${name}`);
  }
  
  console.log('All cookies cleared. Please refresh the page.');
}

clearAllCookies(); 