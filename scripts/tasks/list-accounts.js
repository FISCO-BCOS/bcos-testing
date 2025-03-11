task("listAccounts", "Prints the list of built-in accounts ", async () => {
    const accounts = await ethers.getSigners();

    for (const account of accounts) {
        console.log(account.address);
    }
});