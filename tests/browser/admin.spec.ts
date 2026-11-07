import { test, expect } from '@playwright/test';
test('admin login, product draft, logout and mobile layout', async ({ page }) => {
  let signedIn = false;
  let products: any[] = [];
  await page.route('**/api/admin/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/login')) { signedIn = true; return route.fulfill({json:{username:'owner',csrf:'fixture'}}); }
    if (path.endsWith('/logout')) { signedIn = false; return route.fulfill({json:{ok:true}}); }
    if (!signedIn) return route.fulfill({status:401,json:{error:'Invalid credentials.'}});
    if (path.endsWith('/session')) return route.fulfill({json:{username:'owner',csrf:'fixture'}});
    if (path.endsWith('/products')) {
      if (route.request().method() === 'POST') {
        expect(route.request().headers()['x-csrf-token']).toBe('fixture');
        const product = route.request().postDataJSON();
        products = [product];
        return route.fulfill({json:{product}});
      }
      return route.fulfill({json:{products}});
    }
    if (path.includes('/messages/')) return route.fulfill({json:{message:{reference:'STL-fixture',name:'Client test',email:'fixture@example.test',subject:'Question STL',createdAt:'2026-10-23T12:00:00Z',message:'<script>unsafe()</script>\nBonjour !'}}});
    if (path.endsWith('/messages')) return route.fulfill({json:{messages:[{reference:'STL-fixture',name:'Client test',email:'fixture@example.test',subject:'Question STL',createdAt:'2026-10-23T12:00:00Z'}],page:1,total:1}});
    if (path.endsWith('/stats')) return route.fulfill({json:{grossCents:0,refundedCents:0,netBeforeFeesAndTaxCents:0,paidOrders:0}});
    return route.fulfill({json:{orders:[]}});
  });
  await page.goto('/admin');
  await page.getByLabel('Identifiant', {exact:true}).fill('owner');
  await page.getByLabel('Mot de passe', {exact:true}).fill('fixture password only');
  await page.getByRole('button',{name:'Se connecter',exact:true}).click();
  await expect(page.getByRole('button',{name:'Déconnexion'})).toBeVisible();
  await page.getByRole('button',{name:'Produits',exact:true}).click();
  await page.getByRole('button',{name:'Ajouter un produit'}).click();
  await page.getByLabel('Identifiant stable').fill('test-model');
  await page.getByLabel('Nom',{exact:true}).fill('Objet de test');
  await page.getByRole('button',{name:'Enregistrer la fiche'}).click();
  await expect(page.getByText('Objet de test',{exact:true})).toBeVisible();
  expect(products[0].status).toBe('draft');
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.getByRole('button',{name:'Messages',exact:true}).click();
  await page.getByRole('button',{name:'Question STL',exact:true}).click();
  await expect(page.getByText('<script>unsafe()</script>',{exact:false})).toBeVisible();
  await expect(page.getByRole('link',{name:'Répondre avec ma messagerie'})).toHaveAttribute('href',/^mailto:/);
  expect(await page.locator('.admin-message-body script').count()).toBe(0);
  await page.getByRole('button',{name:'Déconnexion'}).click();
  await expect(page.getByRole('button',{name:'Se connecter',exact:true})).toBeVisible();
});
