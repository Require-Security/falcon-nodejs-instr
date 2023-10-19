const t = setTimeout(() => {
  throw Error("should not hit this")
}, 1000)

clearTimeout(t)
