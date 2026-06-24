import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import MainLayout from "../../layout/MainLayout";
import { jwtDecode } from "jwt-decode";
import userService from "../../services/userService";
import API from "../../services/api";
import projectService from "../../services/projectService";
import storyService from "../../services/storyService";
import taskService from "../../services/taskService";

import {
  FaLaptopCode,
  FaRobot,
  FaPalette,
  FaProjectDiagram,
  FaVideo,
  FaComments,
  FaEnvelope,
  FaCheckCircle,
  FaTasks,
  FaEllipsisV,
  FaPlus,
  FaChartLine,
  FaClock,
  FaUsers,
  FaArrowRight,
  FaCamera,
  FaTimes,
  FaSave,
  FaUserEdit,
  FaCog,
  FaSignOutAlt,
  FaSpinner,
} from "react-icons/fa";

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", "flowio/avatars");

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: formData,
    },
  );

  if (!res.ok) throw new Error("Image upload failed");
  const data = await res.json();
  return data.secure_url;
}

export default function Profile() {
  const [userData, setUserData] = useState({
    name: "Loading...",
    email: "...",
    avatar: "",
    role: "",
    specialization: "none",
  });

  const [editData, setEditData] = useState(userData);
  const [showMenu, setShowMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [pendingAvatarUrl, setPendingAvatarUrl] = useState(null);
  const [message, setMessage] = useState("");

  const [realProjects, setRealProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [taskCount, setTaskCount] = useState(0);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [taskProgress, setTaskProgress] = useState(0);

  const [teams, setTeams] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(true);

  const showMessage = (text) => {
    setMessage(text);
    setTimeout(() => setMessage(""), 2500);
  };

  const getProjectStyle = (title = "") => {
    const lowerTitle = title.toLowerCase();

    if (lowerTitle.includes("web") || lowerTitle.includes("design")) {
      return { icon: <FaPalette />, color: "from-[#f6c14f] to-[#ff9f43]" };
    }

    if (
      lowerTitle.includes("ai") ||
      lowerTitle.includes("bot") ||
      lowerTitle.includes("model")
    ) {
      return { icon: <FaRobot />, color: "from-[#ff5ea8] to-[#ff3d7f]" };
    }

    if (
      lowerTitle.includes("code") ||
      lowerTitle.includes("app") ||
      lowerTitle.includes("dev")
    ) {
      return { icon: <FaLaptopCode />, color: "from-[#8f7cff] to-[#5b7dff]" };
    }

    return { icon: <FaProjectDiagram />, color: "from-[#5fffd0] to-[#35b7ff]" };
  };

  const getEntityId = (entity) => {
    if (!entity) return "";
    if (typeof entity === "string") return entity;
    return String(entity._id || entity.id || "");
  };

  const getStoryAssigneeId = (story) =>
    getEntityId(story.assignee) ||
    getEntityId(story.assigneeId) ||
    getEntityId(story.assignedTo) ||
    getEntityId(story.userId);

  const isDoneStory = (story) => {
    const status = String(story?.status || "").toLowerCase();
    return status === "done" || status === "completed";
  };

  const calculateProjectProgress = (project, stories = []) => {
    if (!stories.length) return project.status === "completed" ? 100 : 0;
    return Math.round(
      (stories.filter(isDoneStory).length / stories.length) * 100,
    );
  };

  const getProjectStatusLabel = (project, progress) => {
    if (progress >= 100 || project.status === "completed") return "Completed";
    if (project.status === "archived" || project.isArchived) return "Archived";
    return "Active";
  };

  const fetchUserTeams = async (companyId, token) => {
    try {
      const response = await API.get(`/api/teams/company/${companyId}`, {
        headers: {
          "x-auth-token": token,
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        const fetchedTeams = response.data.data;

        const teamsWithMembers = await Promise.all(
          fetchedTeams.map(async (team) => {
            try {
              const membersRes = await API.get(`/api/teams/${team._id}/members`, {
                headers: {
                  "x-auth-token": token,
                  Authorization: `Bearer ${token}`,
                },
              });

              return {
                ...team,
                members: membersRes.data.success ? membersRes.data.data : [],
                archived: team.archived || false,
              };
            } catch (err) {
              console.error(`Error fetching members for team ${team._id}:`, err);
              return { ...team, members: [], archived: team.archived || false };
            }
          }),
        );

        setTeams(teamsWithMembers);
      }
    } catch (err) {
      console.error("Error fetching teams:", err);
    } finally {
      setLoadingTeams(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setUserData({
        name: "Guest User",
        email: "guest@workspace.com",
        avatar: "",
        role: "guest",
        specialization: "none",
      });
      setLoadingProjects(false);
      setLoadingTasks(false);
      setLoadingTeams(false);
      return;
    }

    try {
      const decoded = jwtDecode(token);

      let companyId =
        decoded.companyId || decoded.company || localStorage.getItem("companyId");

      if (!companyId && decoded.role === "system-admin") {
        companyId = "66391d5bb96fa3ef34a8145b";
        localStorage.setItem("companyId", companyId);
      }

      const fetchUserProfile = async () => {
        try {
          const user = await userService.getCurrentUser();

          const profileData = {
            name: user.name || "User",
            email: user.email || "No Email Provided",
            avatar: user.avatar || "",
            role: user.role || "",
            specialization: user.specialization || "none",
          };

          setUserData(profileData);
          setEditData(profileData);

          localStorage.setItem("userName", profileData.name);
          localStorage.setItem("userEmail", profileData.email);
          localStorage.setItem("userAvatar", profileData.avatar);
          localStorage.setItem("userRole", profileData.role);
        } catch (err) {
          console.error("Error fetching user profile:", err);

          const fallbackProfile = {
            name: localStorage.getItem("userName") || "Guest User",
            email: localStorage.getItem("userEmail") || "guest@workspace.com",
            avatar: localStorage.getItem("userAvatar") || "",
            role: localStorage.getItem("userRole") || "",
            specialization: "none",
          };

          setUserData(fallbackProfile);
          setEditData(fallbackProfile);
        }
      };

      const fetchProfileProjects = async (currentUserId) => {
        try {
          if (!companyId || !currentUserId) {
            setRealProjects([]);
            return;
          }

          const response = await projectService.getProjectsByCompany(companyId);
          const fetched =
            response?.data ||
            (Array.isArray(response) ? response : response?.projects || []);

          const projectsWithStories = await Promise.all(
            fetched.map(async (project) => {
              try {
                const storiesRes = await storyService.getStoriesByProject(
                  project._id || project.id,
                );
                const stories = storiesRes?.data || storiesRes || [];
                const projectStories = Array.isArray(stories) ? stories : [];

                return {
                  ...project,
                  stories: projectStories,
                  progress: calculateProjectProgress(project, projectStories),
                };
              } catch (err) {
                console.error("Error fetching stories:", err);

                return {
                  ...project,
                  stories: [],
                  progress: Number.isFinite(Number(project.progress))
                    ? Number(project.progress)
                    : calculateProjectProgress(project),
                };
              }
            }),
          );

          const assignedProjects = projectsWithStories.filter((project) =>
            (project.stories || []).some(
              (story) => getStoryAssigneeId(story) === currentUserId,
            ),
          );

          setRealProjects(assignedProjects.slice(0, 2));
        } catch (err) {
          console.error("Error fetching projects for profile:", err);
          setRealProjects([]);
        } finally {
          setLoadingProjects(false);
        }
      };

      const fetchProfileTasks = async () => {
        try {
          const tasks = await taskService.getMyTasks();
          const list = Array.isArray(tasks) ? tasks : [];

          setTaskCount(list.length);

          const doneCount = list.filter((t) => {
            const status = String(t?.status || "").toLowerCase();
            return status === "done" || status === "completed";
          }).length;

          setTaskProgress(
            list.length ? Math.round((doneCount / list.length) * 100) : 0,
          );
        } catch (err) {
          console.error("Error fetching tasks count for profile:", err);
          setTaskCount(0);
          setTaskProgress(0);
        } finally {
          setLoadingTasks(false);
        }
      };

      fetchUserProfile();

      if (companyId) {
        fetchUserTeams(companyId, token);
      }

      const currentUserId = String(
        decoded._id ||
          decoded.id ||
          decoded.userId ||
          decoded.user?._id ||
          decoded.user?.id ||
          localStorage.getItem("userId") ||
          "",
      );

      fetchProfileProjects(currentUserId);
      fetchProfileTasks();
    } catch (error) {
      console.error("Error decoding token in profile:", error);

      setUserData({
        name: "Guest User",
        email: "guest@workspace.com",
        avatar: "",
        role: "guest",
        specialization: "none",
      });

      setLoadingProjects(false);
      setLoadingTasks(false);
      setLoadingTeams(false);
    }
  }, []);

  const handleOpenEditModal = () => {
    setEditData(userData);
    setPendingAvatarUrl(null);
    setShowEditModal(true);
    setShowMenu(false);
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showMessage("Please upload a valid image");
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setEditData((prev) => ({ ...prev, avatar: localPreview }));
    setUploadingAvatar(true);

    try {
      const cloudUrl = await uploadToCloudinary(file);
      setPendingAvatarUrl(cloudUrl);
      setEditData((prev) => ({ ...prev, avatar: cloudUrl }));
      showMessage("Photo ready — click Save to apply");
    } catch (err) {
      console.error("Upload avatar error:", err);
      setEditData((prev) => ({ ...prev, avatar: userData.avatar || "" }));
      showMessage("Upload failed, please try again");
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  };

  const handleRemoveAvatar = () => {
    setEditData((prev) => ({ ...prev, avatar: "" }));
    setPendingAvatarUrl("");
    showMessage("Photo removed — click Save to apply");
  };

  const handleSaveProfile = async () => {
    if (!editData.name.trim()) {
      showMessage("Full name is required");
      return;
    }

    setSavingProfile(true);

    try {
      const payload = {
        name: editData.name.trim(),
        specialization: editData.specialization || "none",
      };

      if (pendingAvatarUrl !== null) {
        payload.avatar = pendingAvatarUrl || null;
      }

      await userService.updateProfile(payload);

      const updatedProfile = {
        ...userData,
        name: editData.name.trim(),
        email: editData.email,
        role: editData.role,
        specialization: editData.specialization || "none",
        avatar:
          pendingAvatarUrl !== null
            ? pendingAvatarUrl || ""
            : editData.avatar || userData.avatar,
      };

      setUserData(updatedProfile);
      setEditData(updatedProfile);

      localStorage.setItem("userName", updatedProfile.name);
      localStorage.setItem("userEmail", updatedProfile.email);
      localStorage.setItem("userAvatar", updatedProfile.avatar);
      localStorage.setItem("userRole", updatedProfile.role || "");
      window.dispatchEvent(new Event("flowioUserUpdated"));
      
      setPendingAvatarUrl(null);
      setShowEditModal(false);
      showMessage("Profile updated successfully");
    } catch (err) {
      console.error("Save profile error:", err);
      showMessage(err.message || "Failed to save profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    window.location.href = "/login";
  };

  const acts = [
    ["Meeting With Sarah", "MEETING", <FaVideo />, "from-[#ff5ea8] to-[#ff3d7f]"],
    ["Client Meeting Q1", "MEETING", <FaComments />, "from-[#5fffd0] to-[#35b7ff]"],
    ["Sarah Sent You A Message", "CHAT MESSAGE", <FaEnvelope />, "from-[#ffb86b] to-[#ff7b54]"],
    ["Meeting 1 Completed", "SUMMARY GENERATED", <FaCheckCircle />, "from-[#d8deea] to-[#9ca8bd]"],
    ["Task Completed", "DONE", <FaTasks />, "from-[#ffd166] to-[#ffb703]"],
  ];

  const card =
    "relative overflow-hidden rounded-[28px] border border-white/5 bg-gradient-to-br from-[#151e66]/95 to-[#0c123f]/95 shadow-[0_22px_55px_rgba(0,0,0,.30)]";

  return (
    <MainLayout title="Profile">
      {message && (
        <div className="fixed right-8 top-8 z-[99999] rounded-[18px] border border-blue-300/15 bg-[#10184c] px-5 py-4 text-sm font-bold text-white shadow-[0_20px_50px_rgba(0,0,0,.45)]">
          {message}
        </div>
      )}

      <div className="grid min-h-0 grid-cols-1 gap-5 text-white lg:h-full lg:grid-cols-[1fr_300px] lg:gap-6">
        <div className="grid min-h-0 grid-rows-[280px_1fr] gap-6 overflow-hidden">
          <div className={`${card} p-5`}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[17px] font-bold">My Assigned Projects</h3>

              <span className="rounded-full bg-blue-400/15 px-3 py-1 text-[10px] font-bold text-[#78aaff]">
                {loadingProjects ? "..." : `${realProjects.length} Assigned`}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:h-[calc(100%-38px)]">
              {loadingProjects ? (
                <div className="col-span-2 flex animate-pulse items-center justify-center text-sm text-cyan-400">
                  Loading assigned projects...
                </div>
              ) : realProjects.length === 0 ? (
                <div className="col-span-2 flex flex-col items-center justify-center rounded-[24px] border border-dashed border-white/10 p-4 text-center text-xs text-white/40">
                  <p className="mb-2">No projects assigned to you yet.</p>

                  <Link to="/projects" className="text-cyan-400 hover:underline">
                    + Create Project
                  </Link>
                </div>
              ) : (
                realProjects.map((project) => {
                  const projectTitle =
                    project.name || project.title || "Untitled Project";
                  const progressValue = Math.max(
                    0,
                    Math.min(100, Number(project.progress) || 0),
                  );
                  const statusLabel = getProjectStatusLabel(project, progressValue);
                  const style = getProjectStyle(projectTitle);

                  return (
                    <Link
                      to={
                        project._id || project.id
                          ? `/projects/${project._id || project.id}`
                          : "/projects"
                      }
                      key={project._id || project.id}
                      className="group flex flex-col justify-between rounded-[24px] border border-white/5 bg-[#10184c]/90 p-4 transition-all duration-300 hover:-translate-y-1 hover:bg-[#151f62] hover:shadow-[0_0_25px_rgba(95,150,255,.22)]"
                    >
                      <div>
                        <div className="mb-4 flex items-center justify-between">
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-[14px] bg-gradient-to-b ${style.color}`}
                          >
                            {style.icon}
                          </div>

                          <span className="text-[13px] font-extrabold">
                            {progressValue}%
                          </span>
                        </div>

                        <h4 className="truncate text-[15px] font-bold capitalize">
                          {projectTitle}
                        </h4>

                        <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-white/55">
                          {project.description ||
                            "Project management and team collaboration workflow."}
                        </p>
                      </div>

                      <div>
                        <div className="mt-4 h-[7px] rounded-full bg-white/10">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${style.color}`}
                            style={{ width: `${progressValue}%` }}
                          />
                        </div>

                        <div className="mt-3 flex justify-between text-[10px] text-white/50">
                          <span>Recent Updates</span>
                          <span>{statusLabel}</span>
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>

          <div className={`${card} min-h-0 p-5`}>
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-[17px] font-bold">Recent Activity</h3>

              <Link
                to="/recent-activity"
                className="flex items-center gap-2 text-[11px] font-semibold text-cyan-300 transition hover:text-cyan-100"
              >
                See All <FaArrowRight />
              </Link>
            </div>

            <div className="h-[calc(100%-42px)] overflow-y-auto pr-2">
              {acts.map((a) => (
                <div
                  key={a[0]}
                  className="mb-3 grid min-h-[56px] grid-cols-[42px_1fr_auto] items-center gap-4 rounded-[20px] bg-[#10184c]/50 px-3 py-2 transition-all duration-300 hover:-translate-y-1 hover:bg-[#151f62]"
                >
                  <div
                    className={`flex h-[38px] w-[38px] items-center justify-center rounded-full bg-gradient-to-b ${a[3]} text-[13px] shadow-[0_0_16px_rgba(255,255,255,.10)]`}
                  >
                    {a[2]}
                  </div>

                  <div>
                    <h4 className="text-[12px] font-bold">{a[0]}</h4>

                    <p className="mt-1 flex items-center gap-2 text-[10px] text-white/45">
                      <FaClock /> 25/6/2023
                    </p>
                  </div>

                  <Link
                    to="/recent-activity"
                    className="flex h-7 items-center justify-center rounded-full bg-blue-400/15 px-3 text-[9px] font-bold text-[#78aaff] transition hover:bg-blue-400/25"
                  >
                    {a[1]}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={`${card} flex min-h-0 flex-col p-5`}>
          <div className="relative mb-4 flex items-center justify-between">
            <h3 className="text-[16px] font-bold">Your Profile</h3>

            <button
              type="button"
              onClick={() => setShowMenu((prev) => !prev)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-white/45 transition hover:bg-white/10 hover:text-white"
            >
              <FaEllipsisV />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-9 z-[9999] w-48 overflow-hidden rounded-[18px] border border-blue-300/10 bg-[#111a4b] p-2 shadow-[0_20px_60px_rgba(0,0,0,.55)]">
                <button
                  type="button"
                  onClick={handleOpenEditModal}
                  className="flex h-10 w-full items-center gap-3 rounded-[13px] px-3 text-xs font-bold text-white/75 transition hover:bg-white/10 hover:text-white"
                >
                  <FaUserEdit className="text-[#78aaff]" />
                  Edit Profile
                </button>

                <Link
                  to="/settings"
                  onClick={() => setShowMenu(false)}
                  className="flex h-10 w-full items-center gap-3 rounded-[13px] px-3 text-xs font-bold text-white/75 transition hover:bg-white/10 hover:text-white"
                >
                  <FaCog className="text-[#45e68b]" />
                  Settings
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex h-10 w-full items-center gap-3 rounded-[13px] px-3 text-xs font-bold text-[#ff6b8a] transition hover:bg-red-400/10"
                >
                  <FaSignOutAlt />
                  Logout
                </button>
              </div>
            )}
          </div>

          <div className="mx-auto flex h-[86px] w-[86px] items-center justify-center overflow-hidden rounded-full bg-gradient-to-b from-[#6eb5ff] to-[#5b7dff] p-[3px] shadow-[0_0_25px_rgba(95,150,255,.35)]">
            {userData.avatar ? (
              <img
                src={userData.avatar}
                alt={userData.name}
                className="h-full w-full rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-full bg-[#10184c] text-[26px] font-black uppercase text-cyan-300">
                {(userData.name || "U").charAt(0)}
              </div>
            )}
          </div>

          <h2 className="mt-3 text-center text-[20px] font-extrabold capitalize">
            {userData.name}
          </h2>

          <p className="mb-5 break-all text-center text-[12px] text-white/50">
            {userData.email}
          </p>

          <div className="mb-5 grid grid-cols-3 gap-2">
            {[
              [<FaChartLine />, loadingTasks ? "..." : `${taskProgress}%`, "Progress"],
              [<FaTasks />, loadingTasks ? "..." : `${taskCount}`, "Tasks"],
              [<FaUsers />, loadingTeams ? "..." : `${teams.length}`, "Teams"],
            ].map((item) => (
              <div
                key={item[2]}
                className="rounded-[16px] bg-[#10184c]/70 p-3 text-center"
              >
                <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-blue-400/15 text-[#78aaff]">
                  {item[0]}
                </div>

                <h4 className="text-[13px] font-bold">{item[1]}</h4>
                <p className="mt-1 text-[9px] text-white/40">{item[2]}</p>
              </div>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {loadingTeams ? (
              <div className="flex h-20 items-center justify-center text-xs text-white/40">
                Loading teams...
              </div>
            ) : teams.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-[20px] border border-dashed border-white/10 p-4 text-center">
                <p className="text-xs text-white/40">No teams found</p>

                <Link
                  to="/teams"
                  className="mt-2 text-[10px] text-cyan-400 hover:underline"
                >
                  Create a team
                </Link>
              </div>
            ) : (
              teams.slice(0, 2).map((team) => (
                <div key={team._id} className="mb-5">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="truncate text-[12px] font-bold">
                      {team.name}
                    </span>

                    <Link
                      to="/teams"
                      className="flex h-6 w-6 items-center justify-center rounded-full border border-white/15 bg-white/5 text-[9px] text-white/70 hover:text-white"
                    >
                      <FaPlus />
                    </Link>
                  </div>

                  <div className="space-y-3">
                    {team.members && team.members.length > 0 ? (
                      team.members.slice(0, 2).map((member, index) => (
                        <Link
                          to="/chat"
                          key={member._id || index}
                          className="flex items-center justify-between rounded-[18px] bg-[#10184c]/60 p-3 transition hover:bg-[#151f62]"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            {member.userId?.avatar ? (
                              <img
                                src={member.userId.avatar}
                                alt={member.userId.name || "Member"}
                                className="h-9 w-9 rounded-full object-cover ring-2 ring-white/10"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-b from-[#6eb5ff] to-[#5b7dff] text-xs font-bold uppercase text-white">
                                {(member.userId?.name || "?").charAt(0)}
                              </div>
                            )}

                            <span className="truncate text-[12px] font-medium text-white">
                              {member.userId?.name || "Unknown User"}
                            </span>
                          </div>

                          {index === 0 && (
                            <span className="shrink-0 rounded-full bg-blue-400/15 px-3 py-1 text-[9px] font-bold text-[#73a8ff]">
                              {member.role_in_team || "Member"}
                            </span>
                          )}
                        </Link>
                      ))
                    ) : (
                      <div className="rounded-[18px] bg-[#10184c]/60 p-3 text-center">
                        <p className="text-[10px] text-white/40">
                          No members yet
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <Link
            to="/teams"
            className="mt-4 flex h-11 w-full shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-[#69b5ff] to-[#6178ff] text-[13px] font-bold shadow-[0_0_18px_rgba(95,150,255,.35)] transition hover:brightness-110"
          >
            See All Teams
          </Link>
        </div>
      </div>

      {showEditModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-[470px] rounded-[30px] border border-blue-300/10 bg-gradient-to-br from-[#151e66] to-[#070d35] p-6 text-white shadow-[0_25px_80px_rgba(0,0,0,.65)]">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-extrabold">Edit Profile</h3>

              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white/60 transition hover:bg-white/15 hover:text-white"
              >
                <FaTimes />
              </button>
            </div>

            <div className="mb-6 flex flex-col items-center">
              <div className="relative">
                <div className="flex h-[96px] w-[96px] items-center justify-center overflow-hidden rounded-full bg-gradient-to-b from-[#6eb5ff] to-[#5b7dff] p-[3px] shadow-[0_0_25px_rgba(95,150,255,.35)]">
                  {editData.avatar ? (
                    <img
                      src={editData.avatar}
                      alt={editData.name}
                      className="h-full w-full rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-[#10184c] text-[28px] font-black uppercase text-cyan-300">
                      {(editData.name || "U").charAt(0)}
                    </div>
                  )}
                </div>

                {uploadingAvatar && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                    <FaSpinner className="animate-spin text-xl text-white" />
                  </div>
                )}

                <label className="absolute -bottom-1 -right-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-[#69b5ff] text-white shadow-[0_0_18px_rgba(95,150,255,.4)] transition hover:scale-105">
                  <FaCamera />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                    disabled={uploadingAvatar}
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={handleRemoveAvatar}
                disabled={uploadingAvatar}
                className="mt-3 rounded-full bg-red-400/15 px-4 py-2 text-xs font-bold text-[#ff6b8a] transition hover:bg-red-400/25 disabled:opacity-50"
              >
                Remove Photo
              </button>
            </div>

            <div className="space-y-4">
              <ProfileInput
                label="Full Name"
                value={editData.name}
                onChange={(value) =>
                  setEditData((prev) => ({ ...prev, name: value }))
                }
                placeholder="Enter your name"
              />

              <ProfileInput
                label="Email Address"
                value={editData.email}
                onChange={() => {}}
                placeholder="Email"
                readOnly
              />

              <div>
                <label className="mb-2 block text-xs font-bold text-white/65">
                  Specialization
                </label>

                <select
                  value={editData.specialization || "none"}
                  onChange={(e) =>
                    setEditData((prev) => ({
                      ...prev,
                      specialization: e.target.value,
                    }))
                  }
                  className="h-12 w-full rounded-[16px] border border-blue-300/10 bg-[#070d35]/80 px-4 text-sm text-white outline-none focus:border-[#6eb5ff]/50"
                >
                  <option value="none" className="bg-[#0b1246]">
                    None
                  </option>
                  <option value="developer" className="bg-[#0b1246]">
                    Developer
                  </option>
                  <option value="designer" className="bg-[#0b1246]">
                    Designer
                  </option>
                  <option value="qa" className="bg-[#0b1246]">
                    QA
                  </option>
                </select>
              </div>
            </div>

            <div className="mt-7 flex gap-3">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="h-11 flex-1 rounded-[16px] bg-white/10 text-sm font-bold text-white/70 transition hover:bg-white/15"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={savingProfile || uploadingAvatar}
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[16px] bg-gradient-to-r from-[#69b5ff] to-[#6178ff] text-sm font-bold text-white shadow-[0_0_22px_rgba(95,150,255,.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingProfile ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <FaSave />
                    Save
                  </>
                )}
              </button>
              
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}

function ProfileInput({ label, value, onChange, placeholder, readOnly = false }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold text-white/65">
        {label}
      </label>

      <input
        value={value}
        onChange={(e) => !readOnly && onChange(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        className={`h-12 w-full rounded-[16px] border px-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#6eb5ff]/50 ${
          readOnly
            ? "cursor-not-allowed border-blue-300/5 bg-[#0b1246]/50 text-white/45"
            : "border-blue-300/10 bg-[#070d35]/80"
        }`}
      />
    </div>
  );
}