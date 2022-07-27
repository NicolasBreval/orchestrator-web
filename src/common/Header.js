import { Container, Nav, Navbar, NavDropdown } from "react-bootstrap";
import { useState, useEffect } from "react";
import 'bootstrap/dist/css/bootstrap.css';
import { v4 as uuidv4 } from "uuid";
import { REACT_APP_DISPLAY_NODE, REACT_APP_DISPLAY_NODE_PORT, REACT_APP_DISPLAY_ENDPOINT_START, POLL_TIMEOUT } from "./Constants";
import { NavLink } from "react-router-dom";

export default function Header() {
    const [date, setDate] = useState(null);
    const [subscriptionList, setSubscriptionList] = useState([]);
    const [versionInfo, setVersionInfo] = useState({ version: "", environment: "" });
    const mode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? "dark" : "light";

    const getSubscriptions = () => {
        let responseCode = -1;

        try {
            fetch(`http://${REACT_APP_DISPLAY_NODE}:${REACT_APP_DISPLAY_NODE_PORT}${REACT_APP_DISPLAY_ENDPOINT_START}/subscriptions/list`)
                .then(response => {
                    responseCode = response.status;
                    return response.json();
                })
                .then(subscriptions => {
                    if (responseCode === 200)
                        setSubscriptionList(subscriptions);
                }).finally(() => setDate(new Date()));
        } catch (error) {
            setDate(new Date());
        }
    }

    const getVersion = () => {
        try {
            fetch(`http://${REACT_APP_DISPLAY_NODE}:${REACT_APP_DISPLAY_NODE_PORT}${REACT_APP_DISPLAY_ENDPOINT_START}/version`)
            .then(response => response.json())
            .then(_versionInfo => setVersionInfo(_versionInfo))
            .finally(() => setDate(new Date()));
        } catch(error) {
            setDate(new Date())
        }
    }

    useEffect(() => {
        if (date == null) {
            getVersion();
        } else {
            let timeout = setTimeout(getVersion, POLL_TIMEOUT);
            return () => clearTimeout(timeout);
        }
    }, [date]);

    useEffect(() => {
        if (date == null) {
            getSubscriptions();
        } else {
            let timeout = setTimeout(getSubscriptions, POLL_TIMEOUT);
            return () => clearTimeout(timeout);
        }
    }, [date]);

    return (
        <Navbar bg="dark" variant="dark">
            <Container fluid>
                <Navbar.Brand as={NavLink} to='/'>{process.env.REACT_APP_APPLICATION_NAME}</Navbar.Brand>
                <Nav className="me-auto">
                    <Nav.Link as={NavLink} to='/creator'>Subscriptions creator</Nav.Link>
                    <Nav.Link as={NavLink} to='/subscribersinfo'>Subscribers info</Nav.Link>
                    <Nav.Link as={NavLink} to='/topology'>Subscriptions topology</Nav.Link>
                    <NavDropdown title="Subscription info" id="collasible-nav-dropdown" variant="dark">
                        {subscriptionList.sort((a, b) => a.name > b.name ? 1 : a.name < b.name ? -1 : 0).map(x =>
                            <NavDropdown.Item key={uuidv4()}>
                                <Nav.Link className={mode === 'light' ? 'navlink-light' : ''} as={NavLink} to={`/subscription?name=${x.name}`}>{x.name}</Nav.Link>
                            </NavDropdown.Item>)}
                    </NavDropdown>
                </Nav>
                <div className="d-flex container-version-info">
                    <span>{versionInfo.version}</span>
                    <span>{versionInfo.environment}</span>
                </div>
            </Container>
        </Navbar>
    );
}