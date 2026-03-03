import Home from './pages/Home';
import SealDetail from './pages/SealDetail';
import LearningPath from './pages/LearningPath';
import ClassLibrary from './pages/ClassLibrary';
import LectureDetail from './pages/LectureDetail';
import __Layout from './Layout.jsx';

export const PAGES = {
    "Home": Home,
    "SealDetail": SealDetail,
    "LearningPath": LearningPath,
    "ClassLibrary": ClassLibrary,
    "LectureDetail": LectureDetail,
};

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};
