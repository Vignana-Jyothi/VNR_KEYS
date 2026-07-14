import { motion } from "framer-motion";
import { useAuthStore } from "../../store/authStore";
import { Calendar } from "lucide-react";
import { useSidebar } from "../../components/layout/DashboardLayout";

const HomePage = () => {
  const { user } = useAuthStore();
  const { sidebarOpen } = useSidebar();

  // Placeholder content removed to avoid unused variables

  return (
    <div className={`space-y-6 ${sidebarOpen ? 'p-4 lg:p-6' : 'p-4 lg:p-8 xl:px-12'}`}>
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-900 bg-opacity-80 backdrop-filter backdrop-blur-lg rounded-xl p-6 border border-gray-800"
      >
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl md:text-3xl font-bold text-white mb-1 md:mb-2">
              Welcome back, {user?.name}! 👋
            </h1>
            <p className="text-gray-300 text-sm md:text-base">
              Here's what's going on in your projects.
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 text-gray-400">
            <Calendar size={16} />
            <span className="text-sm">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
        </div>
      </motion.div>


    </div>
  );
};

export default HomePage;
