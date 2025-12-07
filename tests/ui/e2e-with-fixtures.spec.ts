import { test } from '../fixtures/basePage.fixture'
import { expect } from '@playwright/test'

test.beforeEach(async ({ context, auth, orderPage }) => {
  await context.addInitScript((token) => {
    localStorage.setItem('jwt', token)
  }, auth.jwt)
  await orderPage.open()
})

const newOrder = {
  customerName: 'customerName',
  customerPhone: 'customerPhone',
  comment: 'comment',
}

test('TL-23-1 Create order using fixtures auth', async ({ orderPage }) => {
  await orderPage.nameField.fill(newOrder.customerName)
  await orderPage.phoneField.fill(newOrder.customerPhone)
  await orderPage.commentField.fill(newOrder.comment)
  const createOrderResponse = orderPage.page.waitForResponse('**/orders')
  await orderPage.createOrderButton.click()
  await createOrderResponse
  await orderPage.checkElementVisibility(orderPage.successfulCreationPopup)
})

test('TL-23-2 Find created order using fixtures auth and order create in delivery status', async ({
  orderId,
  orderPage,
  foundPage,
}) => {
  await orderPage.statusButton.click()
  await orderPage.fillElement(orderPage.orderIdInputField, orderId)
  const trackOrderResponse = orderPage.page.waitForResponse('**/orders/*')
  await orderPage.trackButton.click()
  await trackOrderResponse
  expect(await foundPage.orderName.innerText()).toBe(newOrder.customerName)
})

test('TL-23-3 Change status OPEN to DELIVERED', async ({
  orderId,
  orderPage,
  deliveryOrder,
  foundPage
}) => {
  await orderPage.statusButton.click()
  await orderPage.fillElement(orderPage.orderIdInputField, orderId)
  deliveryOrder
  const trackOrderResponse = orderPage.page.waitForResponse('**/orders/*')
  await orderPage.trackButton.click()
  await trackOrderResponse

  await expect(foundPage.page.locator('.status-list__status_active')).toHaveText('DELIVERED')
})