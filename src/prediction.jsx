import { ArrowLeft, Loader, InfoIcon } from "lucide-react";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
// import { uploadVideo } from "./contractDeets.jsx";
import { ethers } from "ethers";
import VideoStorage from "./artifacts/contracts/Upload.sol/VideoStorage.json";
import { Buffer } from "buffer";
import axios from "axios";
import process from "process";
import multihashes from "multihashes";
import Navbar from "./components/Navbar/navbar2";
import { getUserDetails } from "../src/APIs/userDetails";
import { ToastContainer, toast } from "react-toastify";
import Footer from "../src/components/Footer/footer";
import LoadingScreen from "./components/LoadingScreen";

function VideoUpload() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [file, setFile] = useState(null);
  const [framesPerVideo, setFramesPerVideo] = useState(50); // Default value
  const [result, setResult] = useState(null);
  const [tier, setTier] = useState("tier1");
  const [LoaderActive, setLoaderActive] = useState(false);

  useEffect(() => {
    const fetchUserDetails = async () => {
      const userDetails = await getUserDetails();
      if (userDetails) setUser(userDetails);
    };
    fetchUserDetails();
  }, []);
  
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    console.log("Selected file:", selectedFile);
    setFile(selectedFile);
  };

  // blockchain functions and utilities
  const [account, setAccount] = useState("");
  const [contract, setContract] = useState(null);
  const [videos, setVideos] = useState([]);
  // const [videoHash, setVideoHash] = useState("");

  useEffect(() => {
    async function loadProvider() {
      // Ensure the provider is loaded only if Metamask is available
      if (window.ethereum) {
        const isBrowser = typeof window !== "undefined";
        const newProvider = isBrowser
          ? new ethers.providers.Web3Provider(window.ethereum)
          : null;

        // Request wallet connection and get account details
        await newProvider.send("eth_requestAccounts", []);
        const signer = newProvider.getSigner();
        const Useraccount = await signer.getAddress();
        setAccount(Useraccount);

        // Load contract
        const contractAddress = "0xf3b4020f245B9A1082DC0Fdd82d9dCFbbBfEE66D";
        const newContract = new ethers.Contract(
          contractAddress,
          VideoStorage.abi,
          signer
        );
        setContract(newContract);

        console.log("Connected account:", account);
        console.log("Contract:", newContract);
      } else {
        console.error("Ethereum object not found, install MetaMask.");
        //alert('MetaMask not installed! Please install MetaMask to continue.');
      }
    }

    loadProvider();
  }, []);

  // addVideo function
  const uploadVideo = async (file, result) => {
    const startTime = new Date().getTime();
    if (!contract || !file) {
      console.error("Contract not loaded");
      return;
    }
    try {
      const formData = new FormData();
      formData.append("file", file);
      // using Pinata SDK to upload the video to IPFS and then get the hash
      const resFile = await axios({
        method: "post",
        url: "https://api.pinata.cloud/pinning/pinFileToIPFS",
        headers: {
          "Content-Type": "multipart/form-data",
          pinata_api_key: "14cbfa5b8e02de8adae9",
          pinata_secret_api_key:
            "ddef17076bf1b4244d06c8a010743a1cefd8a5b483ea9cec3d1e1c1429a117ae",
        },
        data: formData,
      });

      console.log("File uploaded to IPFS:", resFile.data.IpfsHash);
      const ipfshash = resFile.data.IpfsHash;
      // setVideoHash(ipfshash);

      // arrify the hash
      const deocdedHash = multihashes.decode(
        multihashes.fromB58String(ipfshash)
      );
      const videoHash = Buffer.from(deocdedHash.digest).toString("hex");

      console.log("Video Hash:", videoHash);
      // check if video already exists
      const tx = await contract.addVideo(videoHash, result);
      await tx.wait();
      console.log("Video uploaded successfully");
      toast.success("Video uploaded successfully");
      const endTime = new Date().getTime();
      console.log("Time taken for uploading the video:", endTime - startTime);
    } catch (error) {
      if (error.message.includes("reverted with reason string")) {
        const reason = error.message.split("'")[1]; // Extract the reason string
        if (
          reason ===
          "Video already analyzed and exists on blockchain."
        ) {
          const endTime2 = new Date().getTime();
          console.log(
            "Time taken for retrieving the existing video:",
            endTime2 - startTime
          );
          alert("Video already exists on blockchain");
          console.log("Video already exists on blockchain");
        } else {
          console.error("Transaction failed for another reason:", error.message);
        }
      } else {
        console.log(error);
        toast.error("An error occurred while uploading the video.");
      }
    }
  };

  // get user videos function
  const fetchUserVideos = async () => {
    if (!contract) {
      console.error("Contract not loaded");
      return;
    }
    try {
      const videos = await contract.getUserVideos(account);
      console.log("Fetched videos:", videos);
      return videos;
    } catch (err) {
      console.error("Error fetching videos:", err);
      toast.error("An error occurred while fetching videos.");
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please upload a video file.");
      return;
    }

    setLoaderActive(true);

    // 1. Upload file to Cloudinary
    const cloudinaryFormData = new FormData();
    cloudinaryFormData.append("file", file);
    cloudinaryFormData.append("upload_preset", "DEEPFAKEDETECTION");

    let cloudinaryUrl = "";
    try {
      const cloudinaryResponse = await fetch(
        "https://api.cloudinary.com/v1_1/dpyquo88b/video/upload",
        { method: "POST", body: cloudinaryFormData }
      );
      if (!cloudinaryResponse.ok) {
        throw new Error("Cloudinary upload failed");
      }
      const cloudinaryData = await cloudinaryResponse.json();
      cloudinaryUrl = cloudinaryData.secure_url;
      console.log("Cloudinary URL:", cloudinaryUrl);
    } catch (error) {
      console.error("Cloudinary Error:", error);
      toast.error("An error occurred while uploading to Cloudinary.");
      setLoaderActive(false);
      return;
    }

    // 2. Get prediction result from your video prediction API
    const formData = new FormData();
    formData.append("video", file);
    formData.append("frames_per_video", framesPerVideo);

    let predictionResult = "";
    try {
      const response = await fetch("http://127.0.0.1:10000/predict-video", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        throw new Error("Video prediction failed");
      }
      const data = await response.json();
      console.log("Video prediction result:", data);
      setResult(data);
      predictionResult = data.prediction; // Must be a valid string (e.g., "Fake" or "Real")
    } catch (error) {
      console.error(error);
      toast.error("An error occurred while processing the video.");
      setLoaderActive(false);
      return;
    }

    // 3. Send Cloudinary URL and prediction result to store in MongoDB
    try {
      await fetch("http://localhost:5000/api/addMediaUrl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          mediaUrl: cloudinaryUrl,
          prediction: predictionResult,
          type: "video", // explicitly mark this as a video
        }),
      });
    } catch (error) {
      console.error("Error adding media:", error);
      toast.error("An error occurred while storing video data.");
    } finally {
      setLoaderActive(false);
    }
  };

  return (
    <div className="relative flex flex-col justify-center items-center h-auto min-h-screen pt-32 bg-white dark:bg-gray-900">
      <ToastContainer />
      <Navbar active={1} user={user}/>

      {LoaderActive && <LoadingScreen className="z-100 bg-black bg-opacity-60"/>}

      {/* Loader Mask */}
      {LoaderActive && (
        <div className="absolute inset-0 z-50 flex justify-center items-center mt-[480px]">
          <Loader size={64} className="animate-spin text-white" />
          <div className="text-white text-2xl font-semibold ml-4 ">
            Uploading Video...
          </div>
        </div>
      )}

      {/* Page Content */}
      <div
        className={`w-screen flex justify-evenly ${
          LoaderActive ? "opacity-50" : ""
        }`}
      >
        {/* Video Upload Section */}
        <div className="flex flex-col justify-center items-center gap-4">
          <div className="text-5xl font-semibold text-black dark:text-white">
            Upload Video
          </div>
          {!file ? (
            <div className="">
              <label className="flex h-56 w-116 cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-gray-600 dark:border-gray-300 p-6">
                <div className="space-y-1 text-center">
                  <div className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                      className="h-6 w-6 text-gray-900 dark:text-white"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
                      />
                    </svg>
                  </div>
                  <div className="text-black dark:text-white">
                    <a
                      href="#"
                      className="font-medium text-primary-500 hover:text-primary-700"
                    >
                      Click to upload
                    </a>{" "}
                    or drag and drop
                  </div>
                  <p className="text-sm text-gray-400">
                    strictly mp4 only!
                  </p>
                </div>
                <input
                  type="file"
                  accept="video/mp4,video/mov,video/webm,video/avi,video/wmv"
                  className="sr-only"
                  onChange={handleFileChange}
                />
              </label>
            </div>
          ) : (
            <div>
              <video width="400" controls>
                <source src={URL.createObjectURL(file)} type={file.type} />
                Your browser does not support HTML video.
              </video>
            </div>
          )}
          <div className="flex gap-4 justify-center items-center">
            {file && (
              <button
                onClick={() => setFile(null)}
                className="py-1.5 px-3 bg-[#1e1e1e] hover:bg-gray-200 dark:hover:bg-gray-700 text-red-600 font-semibold rounded-full"
              >
                Remove Video
              </button>
            )}
          </div>

          <button
            onClick={handleUpload}
            className="py-2.5 px-5 bg-[#f1f3f5] dark:bg-gray-700 hover:bg-[#ddd] dark:hover:bg-gray-600 text-[1.185rem] text-gray-900 dark:text-white font-semibold rounded-full"
          >
            Upload
          </button>

          {result && (
            <div className="results-container p-4 m-4 border border-gray-300 dark:border-gray-600 rounded-md text-black dark:text-white bg-white dark:bg-gray-800">
              <h3 className="text-xl font-semibold mb-2">
                Prediction Results
              </h3>
              <p>
                <strong>Prediction:</strong> {result.prediction}
              </p>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default VideoUpload;