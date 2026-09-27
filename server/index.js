require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5050;

const authRoutes = require("./routes/auth.routes");
const propertyRoutes = require("./routes/property.routes");
const adminRoutes = require("./routes/admin.routes");
const adminDataRoutes = require("./routes/admin-data.routes");
const ownerRoutes = require("./routes/owner.routes");
const notificationRoutes = require("./routes/notification.routes");
const studentRoutes = require("./routes/student.routes");
const enquiryRoutes = require("./routes/enquiry.routes");

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(
    path.join(__dirname, "..", "public")
));

app.use("/uploads", express.static(
    path.join(__dirname, "..", "uploads")
));

app.use("/api/auth", authRoutes);
app.use("/api/properties", propertyRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/owner", ownerRoutes);
app.use("/api", studentRoutes);
app.use("/api/enquiries", enquiryRoutes);

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        app: "RentMate",
        status: "online",
        database: "connected",
        time: new Date().toISOString()
    });
});

app.get("/", (req, res) => {
    res.sendFile(
        path.join(__dirname, "..", "public", "index.html")
    );
});

app.get("/login", (req, res) => {
    res.sendFile(
        path.join(__dirname, "..", "public", "login.html")
    );
});

app.get("/register", (req, res) => {
    res.sendFile(
        path.join(__dirname, "..", "public", "register.html")
    );
});

app.use("/api", (req, res) => {
    res.status(404).json({
        success: false,
        error: "API route not found"
    });
});

app.use((req, res) => {
    res.sendFile(
        path.join(__dirname, "..", "public", "index.html")
    );
});

app.listen(PORT, () => {
    console.log("");
    console.log("================================");
    console.log("🏠 RENTMATE SERVER");
    console.log("================================");
    console.log(`🌐 http://localhost:${PORT}`);
    console.log(`❤️  Health: http://localhost:${PORT}/api/health`);
    console.log("================================");
    console.log("");
});
