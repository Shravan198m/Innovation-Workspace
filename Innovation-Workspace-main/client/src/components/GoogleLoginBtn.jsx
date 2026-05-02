import { GoogleLogin } from "@react-oauth/google";

export default function GoogleLoginBtn({ onSuccess }) {
  return (
    <div className="flex justify-center">
      <GoogleLogin
        onSuccess={(res) => {
          onSuccess?.(res?.credential || "");
        }}
        onError={() => {
          // Let the parent show the user-facing error.
        }}
        shape="pill"
        text="signin_with"
        theme="outline"
      />
    </div>
  );
}