const { MongoClient } = require("mongodb");

let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
    if (cachedDb) {
        return cachedDb;
    }

    let uri = process.env.MONGODB_URI;
    const username = process.env.MONGODB_USERNAME;
    const password = process.env.MONGODB_PASSWORD;

    // Inject credentials safely if they aren't already embedded in MONGODB_URI
    if (username && password && uri && !uri.includes("@")) {
        const encodedUser = encodeURIComponent(username);
        const encodedPass = encodeURIComponent(password);
        uri = uri.replace("mongodb+srv://", `mongodb+srv://${encodedUser}:${encodedPass}@`);
    }

    if (!uri) {
        throw new Error("Missing MONGODB_URI environment variable.");
    }

    const client = new MongoClient(uri);
    await client.connect();
    
    // Connects to database named "pacifix" (change if your DB name is different)
    const db = client.db("pacifix");

    cachedClient = client;
    cachedDb = db;

    return db;
}

module.exports = async (req, res) => {
    // Enable CORS for frontend requests
    res.setHeader("Access-Control-Allow-Credentials", true);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
    res.setHeader(
        "Access-Control-Allow-Headers",
        "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
    );

    if (req.method === "OPTIONS") {
        res.status(200).end();
        return;
    }

    try {
        const db = await connectToDatabase();
        const collection = db.collection("products");

        const { id } = req.query;

        if (id) {
            // Find specific product by numeric ID
            const product = await collection.findOne({ id: parseInt(id, 10) });
            
            if (!product) {
                return res.status(404).json({ error: "Product not found" });
            }
            return res.status(200).json(product);
        } else {
            // Fetch all products
            const products = await collection.find({}).toArray();
            return res.status(200).json(products);
        }
    } catch (error) {
        console.error("Database connection error:", error);
        return res.status(500).json({
            error: "Failed to connect to database",
            details: error.message
        });
    }
};
