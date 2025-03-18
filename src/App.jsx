import "./App.css";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar/Navbar.jsx";
import { ArrowRight } from "lucide-react";
import Landing from "./Landing.jsx";
import Predict from "./predict.jsx";
import Home from "./components/Homepage/Homepage.jsx";
import Signup from "./components/Signup/Signup.jsx";
import Login from "./components/Login/Login.jsx";
import VideoUpload from "./prediction.jsx";
import Result from "./components/Result.jsx";
import ImagePredict from "./imagePrediction.jsx";
import ImageResult from "./components/imageResult.jsx";
import Confirmation from './components/Confirmation.jsx';
import Settings from './components/Settings/settings.jsx';
import ChangePassword from "./components/ChangePassword/ChangePassword.jsx";
import ResetPassword from "./components/ResetPassword/ResetPassword.jsx";
import AboutUs from "./components/AboutUs/aboutus.jsx";
// import {ContractDeets} from "./contractDeets.jsx";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/confirmation/:token" element={<Confirmation />} />
        <Route path="/home" element={<Home />} />
        <Route path="/predict" element={<Predict />} />
        <Route path="/upload-video" element={<VideoUpload />} />
        <Route path="/result" element={<Result />} />
        <Route path="/contract" element={<Result />} />
        <Route path="/upload-image" element={<ImagePredict />} />
        <Route path="/image-result" element={<ImageResult />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/change-password" element={<ChangePassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/about-us" element={<AboutUs />} />
        {/* <Route path="/contract" element={<ContractDeets />} /> */}
      </Routes>
    </Router>
  );
}

export default App;
