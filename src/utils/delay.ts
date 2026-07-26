export function delay(ms?: number): Promise<void> {
  const min = 200
  const max = 500
  const wait = ms ?? Math.floor(Math.random() * (max - min + 1)) + min
  return new Promise((resolve) => {
    setTimeout(resolve, wait)
  })
}
