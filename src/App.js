import * as React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainView from './views/MainView';
import Header from './common/Header';
import './App.css';
import SubscriptionCreator from './views/SubscriptionCreator';
import ClusterInfo from './views/ClusterInfo';
import SubscriptionInfo from './views/SubscriptionInfo';
import Topology from './views/Topology';

function App() {
  return(
    <Router basename={process.env.PUBLIC_URL}>
        <Header/>
        <Routes>
          <Route index exact path="/" element={<MainView/>}/>
          <Route exact path="/creator" element={<SubscriptionCreator/>}/>
          <Route exact path="/subscribersinfo" element={<ClusterInfo/>} />
          <Route exact path="/subscription" element={<SubscriptionInfo/>} />
          <Route exact path="/topology" element={<Topology/>} />
        </Routes>
      </Router>
  )
}

export default App;
