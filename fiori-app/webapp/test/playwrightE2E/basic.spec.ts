import { test, expect } from '@playwright/test'

test('App loads and shows title', async ({ page }) => {
  await page.goto('/') // nutzt baseURL
  await expect(page).toHaveTitle(/Camunda SAP BTP Integration/i)
})

/**
 * Fetch the number of process instances for a given process definition ID.
 * @param processDefinitionId ID if process
 * @returns count of process instances
 */
async function fetchProcessInstances(processDefinitionId: string): Promise<any> {
  return new Promise((resolve, reject) => {
    fetch('http://localhost:8088/v2/process-instances/search', { // Ihre Anforderung
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({
        filter: {
          processDefinitionId: processDefinitionId 
        }
      })
    })
      .then(response => response.json())
      .then(data => {
        resolve(data.page.totalItems); // count of instances
      })
      .catch(error => {
        reject(error);
      });
  })
}

test('Start process via UI and check instances on camunda', async ({ page }) => {
  await page.goto('/')
  const instancesBefore = await fetchProcessInstances('process2');
  await page.getByRole('button', { name: 'menu2' }).click();
  await page.getByRole('menuitem', { name: 'run this process...' }).click();
  await page.locator('[id="__component0---app--processName-inner"]').fill('process2');
  await page.getByRole('button', { name: 'start above process' }).click();
  await expect(page.getByRole('textbox', { name: 'Text field' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Text area' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next' })).toBeVisible();
  await page.getByRole('button', { name: 'Next' }).click();

  const instancesAfter = await fetchProcessInstances('process2');
  await expect.poll(async () => {
    return fetchProcessInstances('process2');
  }, {
    message: `Process instance should be increased to ${instancesBefore + 1}`,
    timeout: 10000 // timeout after 10 sec
  }).toBe(instancesBefore + 1); 
})