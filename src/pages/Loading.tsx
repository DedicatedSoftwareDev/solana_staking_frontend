const Loading = ({ ...restProps }) => {

    return (
        <div id="load_div" {...restProps}>
            <img src="./loading.gif" className="loading" />
        </div>
    );
};

export default Loading;
