import {test,expect} from '@playwright/test';
const ids=['catstar-test','amulet','bunny','kero','kitty'];
const models=ids.map((id,i)=>({id,name:['Catstar','Amulet','Bunny','Kero','Kitty'][i],category:'charm',type:'single',price:3.5,image:id==='catstar-test'?'/catstar-test.svg':`/previews/${id}.png`,description:'Digital charm',fileSize:'1 MB',printTime:'Varies'}));
test.beforeEach(async({page})=>{
 await page.route('**/api/catalog',r=>r.fulfill({json:{products:models}}));
 await page.route('**/api/config',r=>r.fulfill({json:{checkout:false}}));
});
test('every STL model opens from the shop and buys only itself; home hero buys Catstar',async({page})=>{
 for(const model of models){
  await page.goto('/shop');
  await expect(page.locator('.pin')).toHaveCount(5);
  await page.getByRole('link',{name:`View ${model.name}`,exact:true}).click();
  await expect(page).toHaveURL(new RegExp(`/product/${model.id}$`));
  await expect(page.getByRole('heading',{name:model.name,exact:true})).toBeVisible();
  await page.getByRole('link',{name:/Buy now/}).click();
  await expect(page).toHaveURL(new RegExp(`checkout\\?buy=${model.id}$`));
 }
 await page.goto('/');
 await page.locator('.hero-buy').getByRole('link',{name:/Buy now/}).click();
 await expect(page).toHaveURL(/checkout\?buy=catstar-test$/);
});
test('shop cards are square; mobile pages fit; archived items disappear',async({page})=>{
 await page.goto('/shop');const media=page.locator('.pin-media');
 await expect(media).toHaveCount(5);
 for(let i=0;i<5;i++){const box=await media.nth(i).boundingBox();expect(Math.abs(box!.width-box!.height)).toBeLessThan(2);}
 await page.setViewportSize({width:390,height:844});
 for(const path of ['/','/shop','/product/amulet','/product/catstar-test']){await page.goto(path);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();}
 await page.route('**/api/catalog',r=>r.fulfill({json:{products:models.filter(p=>p.id!=='bunny')}}));
 await page.goto('/shop');await expect(page.locator('.pin')).toHaveCount(4);await expect(page.getByRole('link',{name:'View Bunny',exact:true})).toHaveCount(0);
 await page.goto('/');await expect(page.locator('.ready').getByRole('link',{name:'View Bunny',exact:true})).toHaveCount(0);
});
