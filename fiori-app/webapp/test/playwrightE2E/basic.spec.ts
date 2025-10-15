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

  // fetch instances before starting a new one
  const instancesBefore = await fetchProcessInstances('e2eTestProcess');

  await page.getByRole('button', { name: 'menu2' }).click();
  await page.getByRole('menuitem', { name: 'run this process...' }).click();
  await page.locator('[id="__component0---app--processName-inner"]').fill('e2eTestProcess');
  await page.getByRole('button', { name: 'start above process' }).click();

  await expect(page.getByText('Success! This form is delivered by Camunda.')).toBeVisible();
  
  await expect(page.getByRole('button', { name: 'Next' })).toBeVisible();
  await page.getByRole('button', { name: 'Next' }).click();

 // Polling until the process instance count increases by 1. This is necessary because starting a process might take some time.
  await expect.poll(async () => {
    return fetchProcessInstances('e2eTestProcess');
  }, {
    message: `Process instance should be increased to ${instancesBefore + 1}`,
    timeout: 10000 // timeout after 10 sec
  }).toBe(instancesBefore + 1); 
})

test('Start process via URL and check instances on camunda', async ({ page }) => {
  await page.goto('?run=e2eTestProcess')
  
  // fetch instances before starting a new one
  const instancesBefore = await fetchProcessInstances('e2eTestProcess');

  await expect(page.getByText('Success! This form is delivered by Camunda.')).toBeVisible();

  await expect(page.getByRole('button', { name: 'Next' })).toBeVisible();
  await page.getByRole('button', { name: 'Next' }).click();

  // Polling until the process instance count increases by 1. This is necessary because starting a process might take some time.
  await expect.poll(async () => {
    return fetchProcessInstances('e2eTestProcess');
  }, {
    message: `Process instance should be increased to ${instancesBefore + 1}`,
    timeout: 10000 // timeout after 10 sec
  }).toBe(instancesBefore + 1); 
})