var functions = {
  test(req: any, res: any) {
    console.log("sdfghj");
    return res
      .status(200)
      .send({ message: "Hello from Node.js! tutaj dominik????" });
  },
};

module.exports = functions;
