import { useState, useEffect } from "react";
import {
  FaHeart,
  FaRegHeart,
  FaRegComment,
  FaEllipsisH,
  FaPaperPlane,
  FaTimes,
  FaTrash,
  FaEdit,
} from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import MainLayout from "../../layout/MainLayout";
import API from "../../services/api";

const formatRole = (role) => {
  if (!role) return "Team Member";
  return role
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export default function Community() {
  const currentUserId = (localStorage.getItem("userId") || "").trim();

  const currentUserInfo = {
    _id: currentUserId,
    name: localStorage.getItem("userName") || "You",
    avatar:
      localStorage.getItem("userAvatar") ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(
        localStorage.getItem("userName") || "You"
      )}&background=5089D6&color=fff&bold=true`,
    role: formatRole(localStorage.getItem("userRole")),
  };

  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [openCommentsId, setOpenCommentsId] = useState(null);
  const [commentDrafts, setCommentDrafts] = useState({});
  const [deletingId, setDeletingId] = useState(null);

  const [isPollOpen, setIsPollOpen] = useState(false);
  const [postText, setPostText] = useState("");
  const [pollText, setPollText] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [pollError, setPollError] = useState("");

  const [editTarget, setEditTarget] = useState(null);
  const [editText, setEditText] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const fetchPosts = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const response = await API.get("/api/posts");
      const fetched = response.data.data || response.data;
      setPosts(Array.isArray(fetched) ? fetched : []);
    } catch {
      if (!silent) toast.error("Failed to load posts.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const isPostOwner = (post) => {
    if (!currentUserId) return false;

    const userField = post.userId;
    const rawId =
      typeof userField === "object" && userField !== null
        ? String(userField._id || userField.id || "")
        : String(userField || "");

    return rawId.trim() !== "" && rawId.trim() === currentUserId;
  };

  const resolveAvatar = (userField) => {
    if (typeof userField === "object" && userField?.avatar) return userField.avatar;

    const uid =
      typeof userField === "object"
        ? String(userField?._id || "")
        : String(userField || "");

    if (uid === currentUserId) return currentUserInfo.avatar;

    const name =
      typeof userField === "object" ? userField?.name || "User" : "User";

    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      name
    )}&background=26377f&color=fff&bold=true`;
  };

  const resolveName = (userField) => {
    if (typeof userField === "object" && userField?.name) return userField.name;

    const uid =
      typeof userField === "object"
        ? String(userField?._id || "")
        : String(userField || "");

    if (uid === currentUserId) return currentUserInfo.name;

    return "Flowio User";
  };

  const resolveRole = (userField) => {
    if (typeof userField === "object" && userField?.role) {
      return formatRole(userField.role);
    }

    const uid =
      typeof userField === "object"
        ? String(userField?._id || "")
        : String(userField || "");

    if (uid === currentUserId) return currentUserInfo.role;

    return "Team Member";
  };

  const addPost = async (e) => {
    e.preventDefault();

    const trimmed = postText.trim();
    if (!trimmed) return;

    const toastId = toast.loading("Posting...");

    try {
      await API.post("/api/posts", { content: trimmed });
      setPostText("");
      await fetchPosts(true);

      toast.update(toastId, {
        render: "Post published!",
        type: "success",
        isLoading: false,
        autoClose: 2500,
      });
    } catch {
      toast.update(toastId, {
        render: "Failed to publish post.",
        type: "error",
        isLoading: false,
        autoClose: 3000,
      });
    }
  };

  const openEditModal = (post) => {
    setOpenMenuId(null);
    setEditTarget(post);
    setEditText(post.content || "");
  };

  const closeEditModal = () => {
    setEditTarget(null);
    setEditText("");
    setIsEditing(false);
  };

  const saveEditedPost = async (e) => {
    e.preventDefault();

    if (!editTarget?._id) return;

    const trimmed = editText.trim();
    if (!trimmed) {
      toast.error("Post content cannot be empty.");
      return;
    }

    setIsEditing(true);
    const toastId = toast.loading("Updating post...");

    try {
      await API.put(`/api/posts/${editTarget._id}`, { content: trimmed });

      setPosts((prev) =>
        prev.map((post) =>
          post._id === editTarget._id ? { ...post, content: trimmed } : post
        )
      );

      toast.update(toastId, {
        render: "Post updated successfully!",
        type: "success",
        isLoading: false,
        autoClose: 2500,
      });

      closeEditModal();
    } catch {
      toast.update(toastId, {
        render: "Failed to update post.",
        type: "error",
        isLoading: false,
        autoClose: 3000,
      });
    } finally {
      setIsEditing(false);
    }
  };

  const toggleLike = async (post) => {
    const postId = post._id;
    if (!postId) return;

    const isLiked = (post.likes || []).some((like) => {
      const likeId =
        typeof like === "object" && like !== null
          ? String(like._id || like.id || "")
          : String(like || "");

      return likeId === currentUserId;
    });

    setPosts((prev) =>
      prev.map((p) => {
        if (p._id !== postId) return p;

        return {
          ...p,
          likes: isLiked
            ? (p.likes || []).filter((id) => {
                const likeId =
                  typeof id === "object" && id !== null
                    ? String(id._id || id.id || "")
                    : String(id || "");

                return likeId !== currentUserId;
              })
            : [...(p.likes || []), currentUserId],
        };
      })
    );

    try {
      if (isLiked) {
        await API.delete(`/api/posts/${postId}/like`);
      } else {
        await API.post(`/api/posts/${postId}/like`);
      }
    } catch {
      setPosts((prev) =>
        prev.map((p) => {
          if (p._id !== postId) return p;

          return {
            ...p,
            likes: isLiked
              ? [...(p.likes || []), currentUserId]
              : (p.likes || []).filter((id) => {
                  const likeId =
                    typeof id === "object" && id !== null
                      ? String(id._id || id.id || "")
                      : String(id || "");

                  return likeId !== currentUserId;
                }),
          };
        })
      );

      toast.error("Could not update like. Try again.");
    }
  };

  const deletePost = async (postId) => {
    if (!postId) return;

    setOpenMenuId(null);
    setDeletingId(postId);

    const toastId = toast.loading("Deleting post...");

    try {
      await API.delete(`/api/posts/${postId}`);

      setPosts((prev) => prev.filter((p) => p._id !== postId));

      toast.update(toastId, {
        render: "Post deleted.",
        type: "success",
        isLoading: false,
        autoClose: 2000,
      });
    } catch {
      toast.update(toastId, {
        render: "Failed to delete post.",
        type: "error",
        isLoading: false,
        autoClose: 3000,
      });
    } finally {
      setDeletingId(null);
    }
  };

  const addComment = async (event, postId) => {
  event.preventDefault();

  if (!postId) return;

  const content = (commentDrafts[postId] || "").trim();

  if (!content) return;

  setCommentDrafts((prev) => ({
    ...prev,
    [postId]: "",
  }));

  try {
    await API.post(
      `/api/posts/${postId}/comment`,
      {
        content,
      }
    );

    await fetchPosts(true);
  } catch (error) {
    console.log(error.response?.data);
    toast.error("Failed to post comment.");
  }
};

  const handleVote = async (pollId, option, postId) => {
    if (!pollId || !option || !postId) return;

    try {
      const response = await API.post("/api/polls/vote", {
        postId,
        pollId,
        optionText: option.text,
        optionId: option._id || option.id,
      });

      if (response.data?.data) {
        const updatedPoll = response.data.data;

        setPosts((prev) =>
          prev.map((p) =>
            p._id === postId ? { ...p, pollId: updatedPoll } : p
          )
        );

        toast.success(response.data.message || "Vote updated!");
      }
    } catch {
      toast.error("Failed to cast vote.");
    }
  };

  const addPoll = async (e) => {
    e.preventDefault();

    const trimmedQuestion = pollText.trim();

    const formattedOptions = pollOptions
      .map((opt) => opt.trim())
      .filter(Boolean)
      .map((text) => ({ text }));

    if (!trimmedQuestion) {
      setPollError("Question is required.");
      return;
    }

    if (formattedOptions.length < 2) {
      setPollError("At least 2 options required.");
      return;
    }

    const createPollPromise = API.post("/api/posts", {
      content: trimmedQuestion,
      pollData: {
        question: trimmedQuestion,
        options: formattedOptions,
      },
    });

    toast.promise(createPollPromise, {
      pending: "Creating poll...",
      success: {
        render() {
          closePollModal();
          fetchPosts(true);
          return "Poll created successfully!";
        },
        autoClose: 2500,
      },
      error: {
        render({ data }) {
          const errorMessage =
            data?.response?.data?.message || "Failed to create poll.";
          setPollError(errorMessage);
          return errorMessage;
        },
        autoClose: 3000,
      },
    });

    try {
      await createPollPromise;
    } catch (error) {
      console.error("Poll creation failed:", error);
    }
  };

  const updatePollOption = (index, value) => {
    setPollOptions((prev) =>
      prev.map((opt, idx) => (idx === index ? value : opt))
    );
  };

  const closePollModal = () => {
    setIsPollOpen(false);
    setPollText("");
    setPollOptions(["", ""]);
    setPollError("");
  };

  return (
    <MainLayout title="Community">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        theme="dark"
        toastStyle={{
          background: "#121957",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      />

      <div className="relative h-full min-h-0 overflow-y-auto text-white lg:pr-2">
        {openMenuId && (
          <button
            type="button"
            onClick={() => setOpenMenuId(null)}
            className="fixed inset-0 z-10 bg-black/20 backdrop-blur-sm"
          />
        )}

        <div className="mx-auto flex w-full max-w-[820px] flex-col">
          <div className="mx-auto mb-7 flex w-full max-w-[760px] items-start gap-3 sm:items-center sm:gap-4">
            <img
              src={currentUserInfo.avatar}
              alt=""
              className="hidden h-11 w-11 rounded-full object-cover ring-2 ring-[#64CFFF]/25 sm:block"
            />

            <form
              onSubmit={addPost}
              className="flex min-w-0 flex-1 flex-wrap items-center gap-3 rounded-[14px] border border-blue-300/10 bg-[#101650]/90 p-3 shadow-[0_14px_34px_rgba(0,0,0,.18)] sm:h-13 sm:flex-nowrap sm:px-5 sm:py-0"
            >
              <input
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                placeholder="Ask a question..."
                className="h-8 min-w-[140px] flex-1 bg-transparent text-xs text-white outline-none placeholder:text-white/55"
              />

              <button
                type="submit"
                disabled={!postText.trim()}
                className="h-8 rounded-full bg-[#5089D6] px-5 text-xs font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
              >
                Post
              </button>

              <button
                type="button"
                onClick={() => setIsPollOpen(true)}
                className="text-[11px] font-semibold text-white/75 transition hover:text-[#64CFFF]"
              >
                + create a poll
              </button>
            </form>
          </div>

          {isLoading && (
            <p className="py-10 text-center text-sm text-white/55">
              Loading community data...
            </p>
          )}

          {!isLoading && (
            <div className="space-y-5">
              {posts.length === 0 && (
                <p className="py-10 text-center text-sm text-white/35">
                  No posts yet. Be the first to share something!
                </p>
              )}

              {posts.map((post) => {
                const postId = post._id;
                if (!postId) return null;

                const isOwner = isPostOwner(post);

                const isLiked = (post.likes || []).some((like) => {
                  const likeId =
                    typeof like === "object" && like !== null
                      ? String(like._id || like.id || "")
                      : String(like || "");

                  return likeId === currentUserId;
                });

                const isDeleting = deletingId === postId;

                const activePoll =
                  post.pollId && typeof post.pollId === "object"
                    ? post.pollId
                    : post.pollData || null;

                return (
                  <article
                    key={postId}
                    className={`relative overflow-hidden rounded-[18px] border border-white/[0.05] bg-gradient-to-br from-[#151d60]/95 to-[#0b103d]/95 px-4 py-4 shadow-[0_20px_48px_rgba(0,0,0,.34),0_0_22px_rgba(28,48,130,.16)] transition-opacity before:absolute before:inset-y-4 before:left-0 before:w-[3px] before:rounded-r-full before:bg-[#26377f]/80 before:shadow-[0_0_18px_rgba(38,55,127,.45)] sm:px-5 ${
                      openMenuId === postId ? "z-20" : "z-0"
                    } ${isDeleting ? "pointer-events-none opacity-40" : ""}`}
                  >
                   <div className="flex items-start justify-between gap-4">
  <div className="flex items-center gap-4">
    <img
      src={resolveAvatar(post.userId)}
      alt=""
      className="h-12 w-12 rounded-full object-cover ring-2 ring-[#64CFFF]/20"
    />

    <div>
      <h3 className="text-[15px] font-bold">
        {resolveName(post.userId)}
      </h3>

      <p className="mt-1 text-[11px] text-white/55">
        {resolveRole(post.userId)}
      </p>
    </div>
  </div>

  <div className="relative">
    <button
      type="button"
      onClick={() =>
        setOpenMenuId(openMenuId === postId ? null : postId)
      }
      className="flex h-8 w-8 items-center justify-center rounded-full text-white/65 transition hover:bg-white/10 hover:text-white"
    >
      <FaEllipsisH size={14} />
    </button>

    {openMenuId === postId && (
  <div className="absolute right-0 top-9 z-20 w-40 rounded-2xl border border-white/10 bg-[#121957] p-2 shadow-[0_18px_40px_rgba(0,0,0,.45)]">
    {isOwner ? (
      <>
       <button
  type="button"
  onClick={() => openEditModal(post)}
  className="mb-1 flex h-9 w-full items-center gap-2 rounded-xl px-3 text-left text-xs font-semibold text-white/80 transition hover:bg-blue-400/15 hover:text-white"
>
  <FaEdit size={11} />
  Edit Post
</button>

<button
  type="button"
  onClick={() => deletePost(postId)}
  className="flex h-9 w-full items-center gap-2 rounded-xl px-3 text-left text-xs font-semibold text-[#ff6b8a] transition hover:bg-red-400/15"
>
  <FaTrash size={11} />
  Delete Post
</button>
      </>
    ) : (
      <>
        <button
          type="button"
          onClick={() => {
            setOpenMenuId(null);
            toast.info("Post link copied.");
          }}
          className="mb-1 flex h-9 w-full items-center gap-2 rounded-xl px-3 text-left text-xs font-semibold text-white/80 transition hover:bg-blue-400/15 hover:text-white"
        >
          Copy Link
        </button>

        <button
          type="button"
          onClick={() => {
            setOpenMenuId(null);
            toast.success("Post reported.");
          }}
          className="flex h-9 w-full items-center gap-2 rounded-xl px-3 text-left text-xs font-semibold text-[#ffbd67] transition hover:bg-yellow-400/15"
        >
          Report Post
        </button>
      </>
    )}
  </div>
)}
  </div>
</div>

                    <p className="mt-5 whitespace-pre-wrap text-[13px] leading-relaxed text-white/85">
                      {post.content}
                    </p>

                    {activePoll && activePoll.options && (
                      <div className="mt-4 space-y-2">
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#64CFFF]/80">
                          📊 {activePoll.question}
                        </p>

                        {activePoll.options.map((option, idx) => {
                          const totalVotes = activePoll.totalVotes || 0;
                          const voteCount = option.voteCount || 0;
                          const percentage = option.percentage || 0;
                          const votedByMe = option.votedByMe || false;

                          return (
                            <button
                              key={option._id || idx}
                              type="button"
                              onClick={() =>
                                handleVote(
                                  activePoll._id || activePoll.id,
                                  option,
                                  postId
                                )
                              }
                              className={`relative h-11 w-full overflow-hidden rounded-xl border px-4 text-left text-xs transition ${
                                votedByMe
                                  ? "border-[#64CFFF]/50 bg-[#64CFFF]/10 text-white"
                                  : "border-white/10 bg-white/[0.04] text-white/75 hover:border-[#64CFFF]/40 hover:bg-[#64CFFF]/5"
                              }`}
                            >
                              <div
                                className="absolute inset-y-0 left-0 rounded-xl bg-[#64CFFF]/10 transition-all duration-500"
                                style={{ width: `${percentage}%` }}
                              />

                              <span className="relative z-10 flex w-full items-center justify-between gap-3">
                                <span className="flex items-center gap-2">
                                  {votedByMe && (
                                    <span className="text-[#64CFFF]">✓</span>
                                  )}
                                  {option.text}
                                </span>

                                {totalVotes > 0 && (
                                  <span className="text-[10px] font-bold text-white/50">
                                    {percentage}%
                                    <span className="ml-1 text-white/30">
                                      ({voteCount})
                                    </span>
                                  </span>
                                )}
                              </span>
                            </button>
                          );
                        })}

                        {(activePoll.totalVotes ?? 0) > 0 && (
                          <p className="pt-1 text-[10px] text-white/30">
                            {activePoll.totalVotes} vote
                            {activePoll.totalVotes !== 1 ? "s" : ""}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-5">
                        <button
                          type="button"
                          onClick={() => toggleLike(post)}
                          className={`flex items-center gap-1.5 text-lg transition ${
                            isLiked
                              ? "text-pink-400"
                              : "text-white/60 hover:text-pink-400"
                          }`}
                        >
                          {isLiked ? <FaHeart /> : <FaRegHeart />}

                          {(post.likes || []).length > 0 && (
                            <span className="text-xs font-bold">
                              {(post.likes || []).length}
                            </span>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setOpenCommentsId(
                              openCommentsId === postId ? null : postId
                            )
                          }
                          className={`flex items-center gap-1.5 text-lg transition ${
                            openCommentsId === postId
                              ? "text-cyan-400"
                              : "text-white/60 hover:text-cyan-400"
                          }`}
                        >
                          <FaRegComment />

                          {(post.comments || []).length > 0 && (
                            <span className="text-xs font-bold">
                              {(post.comments || []).length}
                            </span>
                          )}
                        </button>
                      </div>

                      <span className="text-[10px] text-white/30">
                        {post.createdAt
                          ? new Date(post.createdAt).toLocaleDateString(
                              undefined,
                              {
                                month: "short",
                                day: "numeric",
                              }
                            )
                          : ""}
                      </span>
                    </div>

                    {openCommentsId === postId && (
                      <div className="mt-4 border-t border-white/10 pt-4">
                        <form
                          onSubmit={(e) => addComment(e, postId)}
                          className="flex items-center gap-2 sm:gap-3"
                        >
                          <img
                            src={currentUserInfo.avatar}
                            alt=""
                            className="hidden h-8 w-8 flex-shrink-0 rounded-full object-cover sm:block"
                          />

                          <input
                            value={commentDrafts[postId] || ""}
                            onChange={(e) =>
                              setCommentDrafts((prev) => ({
                                ...prev,
                                [postId]: e.target.value,
                              }))
                            }
                            placeholder="Add a comment..."
                            className="h-10 min-w-0 flex-1 rounded-[14px] border border-white/10 bg-[#080d31] px-4 text-xs text-white outline-none placeholder:text-white/35 focus:border-[#64CFFF]/60"
                          />

                          <button
                            type="submit"
                            disabled={!(commentDrafts[postId] || "").trim()}
                            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[14px] bg-[#5089D6] text-sm text-white transition hover:bg-[#447bc4] disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <FaPaperPlane />
                          </button>
                        </form>

                        <div className="mt-4 space-y-3">
                          {(post.comments || []).length === 0 ? (
                            <p className="py-2 text-center text-xs text-white/30">
                              No comments yet. Start the conversation.
                            </p>
                          ) : (
                            (post.comments || []).map((comment, index) => {
                              if (!comment) return null;

                              return (
                                <div
                                  key={comment._id || comment.id || index}
                                  className="flex items-start gap-3 rounded-2xl bg-white/[0.04] p-3"
                                >
                                  <img
                                    src={resolveAvatar(comment.userId)}
                                    alt=""
                                    className="h-8 w-8 flex-shrink-0 rounded-full object-cover"
                                  />

                                  <div className="min-w-0 flex-1">
                                    <span className="text-xs font-bold text-white">
                                      {resolveName(comment.userId)}
                                    </span>

                                    <p className="mt-1 break-words text-xs leading-5 text-white/70">
                                      {comment.content}
                                    </p>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {editTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-[26px] border border-white/10 bg-gradient-to-br from-[#16206d] to-[#0d1448] p-6 text-white shadow-2xl">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-lg font-bold">Edit Post</h3>

                <button
                  type="button"
                  onClick={closeEditModal}
                  className="rounded-full p-2 text-white/55 transition hover:bg-white/10 hover:text-white"
                >
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={saveEditedPost} className="space-y-4">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows="5"
                  placeholder="Update your post..."
                  className="w-full resize-none rounded-2xl border border-white/10 bg-[#0a0f35] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#64CFFF]"
                />

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeEditModal}
                    disabled={isEditing}
                    className="h-10 rounded-xl px-4 text-sm font-semibold text-white/65 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isEditing || !editText.trim()}
                    className="h-10 rounded-xl bg-[#5089D6] px-6 text-sm font-bold transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isEditing ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {isPollOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-[26px] border border-white/10 bg-gradient-to-br from-[#16206d] to-[#0d1448] p-6 text-white shadow-2xl">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-lg font-bold">Create Poll</h3>

                <button
                  type="button"
                  onClick={closePollModal}
                  className="rounded-full p-2 text-white/55 transition hover:bg-white/10 hover:text-white"
                >
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={addPoll} className="space-y-4">
                {pollError && (
                  <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs text-red-200">
                    {pollError}
                  </div>
                )}

                <textarea
                  value={pollText}
                  onChange={(e) => setPollText(e.target.value)}
                  rows="3"
                  placeholder="Write your poll question..."
                  className="w-full resize-none rounded-2xl border border-white/10 bg-[#0a0f35] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#64CFFF]"
                />

                <div className="space-y-3">
                  {pollOptions.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        value={option}
                        onChange={(e) =>
                          updatePollOption(index, e.target.value)
                        }
                        placeholder={`Option ${index + 1}`}
                        className="h-11 w-full rounded-xl border border-white/10 bg-[#0a0f35] px-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#64CFFF]"
                      />

                      {pollOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() =>
                            setPollOptions((prev) =>
                              prev.filter((_, i) => i !== index)
                            )
                          }
                          className="flex-shrink-0 text-white/30 transition hover:text-[#ff6b8a]"
                        >
                          <FaTimes size={12} />
                        </button>
                      )}
                    </div>
                  ))}

                  {pollOptions.length < 6 && (
                    <button
                      type="button"
                      onClick={() =>
                        setPollOptions((prev) => [...prev, ""])
                      }
                      className="h-10 rounded-xl border border-white/10 px-4 text-xs font-semibold text-white/70 transition hover:border-[#64CFFF]/45 hover:text-white"
                    >
                      + Add option
                    </button>
                  )}
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closePollModal}
                    className="h-10 rounded-xl px-4 text-sm font-semibold text-white/65 transition hover:bg-white/10 hover:text-white"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="h-10 rounded-xl bg-[#5089D6] px-6 text-sm font-bold transition hover:brightness-110"
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}