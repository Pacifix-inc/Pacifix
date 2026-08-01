const { MongoClient } = require("mongodb");

let cachedDb = null;

async function connectToDatabase() {
    if (cachedDb) return cachedDb;

    let uri = process.env.MONGODB_URI;
    const username = process.env.MONGODB_USERNAME;
    const password = process.env.MONGODB_PASSWORD;

    if (username && password && uri && !uri.includes("@")) {
        const encodedUser = encodeURIComponent(username);
        const encodedPass = encodeURIComponent(password);
        uri = uri.replace("mongodb+srv://", `mongodb+srv://${encodedUser}:${encodedPass}@`);
    }

    if (!uri) throw new Error("Missing MONGODB_URI environment variable.");

    const client = new MongoClient(uri);
    await client.connect();
    
    // Connects to "pacifix" database
    const db = client.db("pacifix");
    cachedDb = db;
    return db;
}

module.exports = async (req, res) => {
    // CORS Headers
    res.setHeader("Access-Control-Allow-Credentials", true);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
    res.setHeader(
        "Access-Control-Allow-Headers",
        "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
    );

    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const db = await connectToDatabase();
        const analyticsCollection = db.collection("analytics");

        // Increment checkoutNum by 1 in the analytics collection
        // { upsert: true } automatically creates the document if it doesn't exist yet
        const result = await analyticsCollection.findOneAndUpdate(
            { _id: "store_stats" }, 
            { $inc: { checkoutNum: 1 } },
            { upsert: true, returnDocument: "after" }
        );

        return res.status(200).json({
            success: true,
            message: "Checkout recorded successfully",
            totalCheckouts: result.value ? result.value.checkoutNum : result.checkoutNum
        });

    } catch (error) {
        console.error("Checkout counter error:", error);
        return res.status(500).json({
            error: "Failed to process checkout",
            details: error.message
        });
    }
};
