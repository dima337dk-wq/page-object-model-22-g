import { expect, test } from '@playwright/test'
import { LoginPage } from '../pages/login-page'
import { OrderPage } from '../pages/order-page'
import FoundPage from '../pages/found-page'
import { SERVICE_URL } from '../../config/env-data'
import NotFoundPage from '../pages/not-found-page'

const jwt =
  'eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJkbWl0cmlraXJsaSIsImV4cCI6MTc2NDcwMDcwNiwiaWF0IjoxNzY0NjgyNzA2fQ.vX4LGmFZ9cG9yEzT9t4671LvSIchPHu4KxisRh5_ySe8dpAh08gUc4v7dGiBQCIQaHqT2pNAwLrhq6OgEvUyOg'

test('TL-22-1 signIn with mocks', async ({ page }) => {
  const loginPage = new LoginPage(page)
  const orderPage = new OrderPage(page)
  await loginPage.mockAuth()
  await loginPage.open()
  await loginPage.usernameField.fill('test')
  await loginPage.passwordField.fill('test1234')
  await loginPage.signInButton.click()
  await orderPage.checkElementVisibility(orderPage.trackButton)
})

test('TL-22-2 create and find order with mocks', async ({ context }) => {
  const newOrder = {
    status: 'OPEN',
    courierId: null,
    customerName: 'customerName',
    customerPhone: 'customerPhone',
    comment: 'comment',
    id: 100,
  }
  await context.addInitScript((token) => {
    localStorage.setItem('jwt', token)
  }, jwt)
  const page = await context.newPage()
  const loginPage = new LoginPage(page)
  const orderPage = new OrderPage(page)
  const foundPage = new FoundPage(page)
  // await loginPage.mockAuth(); <--- disabled because of JWT
  await loginPage.open()
  // await loginPage.usernameField.fill('test'); <--- disabled because of JWT
  // await loginPage.passwordField.fill('test1234'); <--- disabled because of JWT
  // await loginPage.signInButton.click(); <--- disabled because of JWT

  await expect(orderPage.phoneField).toBeVisible()

  await orderPage.nameField.fill(newOrder.customerName)
  await orderPage.phoneField.fill(newOrder.customerPhone)
  await orderPage.commentField.fill(newOrder.comment)
  await page.route('**/orders', async (route) => {
    await route.fulfill({
      status: 200,
      json: newOrder,
    })
  })
  const createOrderResponse = page.waitForResponse('**/orders')
  await orderPage.createOrderButton.click()
  await createOrderResponse
  await orderPage.checkElementVisibility(orderPage.successfulCreationPopup)
  expect(await orderPage.getOrderIdFromPopup()).toBe(newOrder.id)
  await orderPage.okButton.click()
  await orderPage.statusButton.click()
  await orderPage.fillElement(orderPage.orderIdInputField, String(newOrder.id))

  await page.route('**/orders/*', async (route) => {
    await route.fulfill({
      status: 200,
      json: newOrder,
    })
  })
  const trackOrderResponse = page.waitForResponse('**/orders/*')
  await orderPage.trackButton.click()
  await trackOrderResponse
  expect(await foundPage.orderName.innerText()).toBe(newOrder.customerName)
})

test('TL-22-3 create and not find order with mocks', async ({ context }) => {
  await context.addInitScript((token) => {
    localStorage.setItem('jwt', token)
  }, jwt)
  const page = await context.newPage()
  const loginPage = new LoginPage(page)
  const orderPage = new OrderPage(page)
  const notFoundPage = new NotFoundPage(page)
  await loginPage.open()
  await orderPage.statusButton.click()
  await orderPage.fillElement(orderPage.orderIdInputField, String(-1))
  await orderPage.trackButton.click()
  await expect(notFoundPage.title).toBeVisible()
})

test('TL-22-4 code 500', async ({ context }) => {
  await context.addInitScript((token) => {
    localStorage.setItem('jwt', token)
  }, jwt)
  const page = await context.newPage()
  const loginPage = new LoginPage(page)
  const orderPage = new OrderPage(page)
  await loginPage.open()
  await orderPage.statusButton.click()
  await orderPage.fillElement(orderPage.orderIdInputField, String(-1))

  await page.route('**/orders/*', async (route) => {
    await route.fulfill({
      status: 500,
    })
  })
  const trackOrderResponse = page.waitForResponse('**/orders/*')
  await orderPage.trackButton.click()
  const response = await trackOrderResponse
  expect(response.status()).toBe(500)
})
