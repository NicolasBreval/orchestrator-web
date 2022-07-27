import { Toast } from "react-bootstrap";

export const generateToast = (headerStrong, headerSmall, body, showVar, setShowVarFunc, delay, variant) => {
    return (
        <Toast bg={variant} onClose={() => setShowVarFunc(false)} show={showVar} delay={delay} autohide={delay !== null && delay !== undefined && delay > 0}>
            <Toast.Header>
                <img
                    src="holder.js/20x20?text=%20"
                    className="rounded me-2"
                    alt=""
                />
                <strong className="me-auto">{headerStrong}</strong>
                <small>{headerSmall}</small>
            </Toast.Header>
            <Toast.Body className="toast-bold">{body}</Toast.Body>
        </Toast>
    )
}